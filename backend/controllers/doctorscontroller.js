// backend/controllers/doctor.controller.js
import { db } from "../config/db.js";

function toMySql(dt) {
  const pad = n => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
const addMinutes = (dt, mins) => new Date(dt.getTime() + mins * 60000);
const overlap = (aS, aE, bS, bE) => aS < bE && bS < aE;

/** GET /api/doctors -> [{doctor_id, full_name, slot_minutes, department_id}] */
export async function listDoctors(_req, res) {
  const [rows] = await db.query(
    `SELECT doctor_id, full_name, slot_minutes, department_id
       FROM doctors
      WHERE active=1
      ORDER BY full_name`
  );
  res.json(rows);
}

/** GET /api/doctors/slots?doctor_name=...&date=YYYY-MM-DD
 *      OR /api/doctors/slots?doctor_id=2&date=YYYY-MM-DD
 */
export async function listDoctorSlots(req, res) {
  try {
    const { doctor_name, doctor_id, date } = req.query || {};
    if (!date || (!doctor_name && !doctor_id)) {
      return res.status(400).json({ message: "doctor_name or doctor_id and ?date=YYYY-MM-DD required" });
    }

    // Resolve doctor (prefer name)
    let doc;
    if (doctor_name?.trim()) {
      const [[row]] = await db.query(
        `SELECT doctor_id, full_name, slot_minutes, department_id
           FROM doctors WHERE active=1 AND full_name=? LIMIT 1`,
        [doctor_name.trim()]
      );
      doc = row;
    } else {
      const [[row]] = await db.query(
        `SELECT doctor_id, full_name, slot_minutes, department_id
           FROM doctors WHERE active=1 AND doctor_id=? LIMIT 1`,
        [doctor_id]
      );
      doc = row;
    }
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    // Day-of-week (Mon=1..Sun=7)
    const day = new Date(`${date}T00:00:00`);
    const dow = ((day.getDay() + 6) % 7) + 1;

    // Availability for that weekday
    const [avail] = await db.query(
      `SELECT start_time, end_time
         FROM doctor_availability
        WHERE doctor_id=? AND day_of_week=?`,
      [doc.doctor_id, dow]
    );
    if (avail.length === 0) return res.json([]);

    // Time window of the day
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd   = new Date(`${date}T23:59:59`);

    // Existing scheduled appointments (overlap with the day)
    const [busy] = await db.query(
      `SELECT start_at, end_at
         FROM appointments
        WHERE doctor_id=? AND status='SCHEDULED'
          AND NOT (end_at < ? OR start_at > ?)`,
      [doc.doctor_id, toMySql(dayStart), toMySql(dayEnd)]
    );

    // Leaves that overlap the day
    const [leaves] = await db.query(
      `SELECT start_at, end_at
         FROM doctor_leave
        WHERE doctor_id=?
          AND NOT (end_at < ? OR start_at > ?)`,
      [doc.doctor_id, toMySql(dayStart), toMySql(dayEnd)]
    );

    // Build slots
    const slots = [];
    const minutes = Number(doc.slot_minutes || 30);
    const now = new Date();

    for (const w of avail) {
      const wStart = new Date(`${date}T${w.start_time}`);
      const wEnd   = new Date(`${date}T${w.end_time}`);

      for (let s = new Date(wStart); s.getTime() + minutes * 60000 <= wEnd.getTime(); s = addMinutes(s, minutes)) {
        const e = addMinutes(s, minutes);
        // Skip past slots (if booking for today)
        if (e <= now) continue;

        const conflict =
          busy.some(a => overlap(s, e, new Date(a.start_at), new Date(a.end_at))) ||
          leaves.some(l => overlap(s, e, new Date(l.start_at), new Date(l.end_at)));
        if (conflict) continue;

        const fmt = d => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        slots.push({ start_at: toMySql(s), end_at: toMySql(e), label: `${fmt(s)} - ${fmt(e)}` });
      }
    }

    res.json(slots);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Server error" });
  }
}
export async function listWeeklyAvailability(_req, res) {
  const [rows] = await db.query(
    `SELECT d.doctor_id, d.full_name, d.slot_minutes,
            a.day_of_week, DATE_FORMAT(a.start_time, '%H:%i') AS start_time,
            DATE_FORMAT(a.end_time,   '%H:%i') AS end_time
       FROM doctors d
       LEFT JOIN doctor_availability a ON a.doctor_id = d.doctor_id
      WHERE d.active = 1
      ORDER BY d.full_name, a.day_of_week, a.start_time`
  );
  res.json(rows);
}
