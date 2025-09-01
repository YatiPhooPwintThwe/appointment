// backend/controllers/appointment.controller.js
import { db } from "../config/db.js";
import { sendBookingEmail } from "../mailtrap/emails.js";

function toMySql(dt) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// Helper: resolve doctor by name first (fallback to id if provided)
async function resolveDoctor(conn, { doctor_name, doctor_id }) {
  if (doctor_name && String(doctor_name).trim()) {
    const [[doc]] = await conn.query(
      `SELECT doctor_id, full_name, slot_minutes, department_id
         FROM doctors
        WHERE active=1 AND full_name = ?
        LIMIT 1`,
      [doctor_name.trim()]
    );
    return doc || null;
  }
  if (doctor_id) {
    const [[doc]] = await conn.query(
      `SELECT doctor_id, full_name, slot_minutes, department_id
         FROM doctors
        WHERE active=1 AND doctor_id = ?
        LIMIT 1`,
      [doctor_id]
    );
    return doc || null;
  }
  return null;
}

export const createAppointmentFull = async (req, res) => {
  const { patient = {}, doctor_name, doctor_id, start_at, reason } = req.body || {};
  if (!start_at || !patient.full_name || !patient.dob || !patient.nric) {
    return res
      .status(400)
      .json({ message: "start_at and patient full_name/dob/nric are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Resolve doctor by full name (preferred) or id
    const doc = await resolveDoctor(conn, { doctor_name, doctor_id });
    if (!doc) {
      await conn.rollback();
      return res.status(404).json({ message: "Doctor not found" });
    }

    // patient: find by NRIC or create (+ light update)
    let patientId;
    {
      const [[p]] = await conn.query(
        `SELECT patient_id FROM patient WHERE nric=? LIMIT 1`,
        [patient.nric]
      );
      if (p) {
        patientId = p.patient_id;
        await conn.query(
          `UPDATE patient
              SET full_name=?, dob=?, phone=?, address=?, postal_code=?, updated_at=NOW()
            WHERE patient_id=?`,
          [
            patient.full_name,
            patient.dob,
            patient.phone || null,
            patient.address || null,
            patient.postal_code || null,
            patientId,
          ]
        );
      } else {
        const [ins] = await conn.query(
          `INSERT INTO patient (full_name, dob, nric, phone, address, postal_code, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            patient.full_name,
            patient.dob,
            patient.nric,
            patient.phone || null,
            patient.address || null,
            patient.postal_code || null,
          ]
        );
        patientId = ins.insertId;
      }
    }

    // Compute end_at using slot length
    const s = new Date(start_at);
    const e = new Date(s.getTime() + doc.slot_minutes * 60000);
    const startAtSql = toMySql(s);
    const endAtSql = toMySql(e);

    // Overlap guard
    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt
         FROM appointments
        WHERE doctor_id=?
          AND status='SCHEDULED'
          AND NOT (end_at <= ? OR start_at >= ?)`,
      [doc.doctor_id, startAtSql, endAtSql]
    );
    if (cnt > 0) {
      await conn.rollback();
      return res.status(409).json({ message: "Selected time is no longer available" });
    }

    // Insert appointment
    await conn.query(
      `INSERT INTO appointments
       (start_at, end_at, status, reason, doctor_id, patient_id, user_id, department_id, created_at, updated_at)
       VALUES (?, ?, 'SCHEDULED', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        startAtSql,
        endAtSql,
        reason || null,
        doc.doctor_id,
        patientId,
        req.user?.id || null,
        doc.department_id,
      ]
    );

    await conn.commit();

    // Confirmation email to the logged-in user (non-blocking)
    const toEmail = req.user?.email;
    if (toEmail) {
      sendBookingEmail(toEmail, {
        doctorName: doc.full_name,
        start_time: startAtSql,
        end_time: endAtSql,
      }).catch(() => {});
    }

    res.status(201).json({ success: true, message: "Appointment booked successfully" });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error("createAppointmentFull:", e);
    res.status(500).json({ message: e.message || "Server error" });
  } finally {
    conn.release();
  }
};

// GET /api/appointments  (mine)
export const myAppointments = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "50", 10)));
    const [rows] = await db.query(
      `SELECT
          a.appointment_id, a.start_at, a.end_at, a.status, a.reason,
          a.created_at, a.updated_at,
          d.full_name AS doctor_name, p.full_name AS patient_name
       FROM appointments a
       JOIN doctors d  ON d.doctor_id  = a.doctor_id
       JOIN patient p  ON p.patient_id = a.patient_id
       WHERE a.user_id = ?
       ORDER BY a.start_at DESC
       LIMIT ?`,
      [req.user.id, limit]
    );
    return res.json(rows);
  } catch (e) {
    console.error("myAppointments:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/appointments/:id
export const getAppointment = async (req, res) => {
  try {
    const { id } = req.params; // appointment_id
    const [[row]] = await db.query(
      `SELECT
          a.appointment_id, a.start_at, a.end_at, a.status, a.reason,
          a.created_at, a.updated_at,
          a.doctor_id, d.full_name AS doctor_name,
          a.patient_id, p.full_name AS patient_name
       FROM appointments a
       JOIN doctors d  ON d.doctor_id  = a.doctor_id
       JOIN patient p  ON p.patient_id = a.patient_id
       WHERE a.appointment_id = ? AND a.user_id = ?`,
      [id, req.user.id]
    );
    if (!row) return res.status(404).json({ message: "Appointment not found" });
    return res.json(row);
  } catch (e) {
    console.error("getAppointment:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/appointments/:id/cancel
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `UPDATE appointments
         SET status = 'CANCELLED', updated_at = NOW()
       WHERE appointment_id = ? AND user_id = ? AND status = 'SCHEDULED'`,
      [id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ message: "Appointment not cancellable (not found or not SCHEDULED)" });
    return res.json({ success: true, message: "Appointment cancelled" });
  } catch (e) {
    console.error("cancelAppointment:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/appointments/:id/reschedule
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_at, end_at } = req.body || {};
    if (!start_at || !end_at)
      return res.status(400).json({ message: "start_at and end_at are required" });
    if (new Date(start_at) >= new Date(end_at))
      return res.status(400).json({ message: "start_at must be before end_at" });

    const [result] = await db.query(
      `UPDATE appointments
         SET start_at = ?, end_at = ?, updated_at = NOW()
       WHERE appointment_id = ? AND user_id = ? AND status = 'SCHEDULED'`,
      [start_at, end_at, id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ message: "Appointment not reschedulable (not found or not SCHEDULED)" });
    return res.json({ success: true, message: "Appointment rescheduled" });
  } catch (e) {
    if (e.sqlState === "45000") return res.status(400).json({ message: e.message });
    console.error("rescheduleAppointment:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/appointments/:id/complete
export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `UPDATE appointments
         SET status = 'COMPLETED', updated_at = NOW()
       WHERE appointment_id = ? AND user_id = ? AND status = 'SCHEDULED'`,
      [id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ message: "Appointment not completable (not found or not SCHEDULED)" });
    return res.json({ success: true, message: "Appointment marked COMPLETED" });
  } catch (e) {
    console.error("completeAppointment:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/appointments/:id/no-show
export const markNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `UPDATE appointments
         SET status = 'NO SHOW', updated_at = NOW()
       WHERE appointment_id = ? AND user_id = ? AND status = 'SCHEDULED'`,
      [id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({
        message: "Appointment not updatable to NO SHOW (not found or not SCHEDULED)",
      });
    return res.json({ success: true, message: "Appointment marked NO SHOW" });
  } catch (e) {
    console.error("markNoShow:", e);
    return res.status(500).json({ message: "Server error" });
  }
};