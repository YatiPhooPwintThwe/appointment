import { useEffect, useState } from "react";
import NavBar from "../../component/navbar.jsx";

export default function Home() {
  const [doctors, setDoctors] = useState([]); // [{ full_name, slot_minutes }]
  const [slots, setSlots] = useState([]); // [{ start_at, end_at, label }]
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  // form state
  const [form, setForm] = useState({
    doctor_name: "",
    date: "", // YYYY-MM-DD
    slot_start_at: "", // MySQL datetime from slots
    reason: "",

    // patient info
    full_name: "",
    dob: "", // YYYY-MM-DD
    nric: "",
    phone: "",
    address: "",
    postal_code: "",
  });

  // === limits for date pickers ===
  const TODAY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Load doctors (names & slot length)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/doctors");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load doctors");
        const list = (Array.isArray(data) ? data : [])
          .map((d) => ({
            full_name: d.full_name,
            slot_minutes: d.slot_minutes,
          }))
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setDoctors(list);
      } catch (e) {
        setMsg({ ok: "", err: e.message });
      }
    })();
  }, []);

  // Load time slots when doctor or date changes
  useEffect(() => {
    (async () => {
      setSlots([]);
      setForm((f) => ({ ...f, slot_start_at: "" }));
      if (!form.doctor_name || !form.date) return;

      try {
        const res = await fetch(
          `/api/doctors/slots?doctor_name=${encodeURIComponent(
            form.doctor_name
          )}&date=${form.date}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load slots");
        setSlots(Array.isArray(data) ? data : []);
      } catch (e) {
        setMsg({ ok: "", err: e.message });
      }
    })();
  }, [form.doctor_name, form.date]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ ok: "", err: "" });

    // Client validation
    if (!form.doctor_name)
      return setMsg({ ok: "", err: "Please select a doctor." });
    if (!form.date || !form.slot_start_at)
      return setMsg({
        ok: "",
        err: "Please select a date and a time slot.",
      });
    if (!form.full_name || !form.dob || !form.nric)
      return setMsg({
        ok: "",
        err: "Patient name, DOB and NRIC are required.",
      });
    if (form.dob > TODAY)
      return setMsg({
        ok: "",
        err: "Date of birth cannot be in the future.",
      });

    setLoading(true);
    try {
      const payload = {
        doctor_name: form.doctor_name, // use full name, not ID
        start_at: form.slot_start_at, // backend computes end_at
        reason: form.reason?.trim() || null,
        patient: {
          full_name: form.full_name,
          dob: form.dob,
          nric: form.nric,
          phone: form.phone || null,
          address: form.address || null,
          postal_code: form.postal_code || null,
        },
      };

      const res = await fetch("/api/appointments/full", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Booking failed");

      setMsg({ ok: data?.message || "Appointment booked!", err: "" });

      // Keep doctor & date; clear patient/slot/reason
      setForm((f) => ({
        ...f,
        slot_start_at: "",
        reason: "",
        full_name: "",
        dob: "",
        nric: "",
        phone: "",
        address: "",
        postal_code: "",
      }));

      // Remove the taken slot from the dropdown
      setSlots((prev) => prev.filter((s) => s.start_at !== form.slot_start_at));
    } catch (e2) {
      setMsg({ ok: "", err: e2.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Book an Appointment</h1>

        {msg.ok && (
          <div className="mb-3 rounded bg-green-50 border border-green-200 text-green-800 px-3 py-2">
            {msg.ok}
          </div>
        )}
        {msg.err && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-800 px-3 py-2">
            {msg.err}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl shadow p-4 grid gap-4"
        >
          {/* Patient details */}
          <section className="grid md:grid-cols-2 gap-3">
            <Field
              label="Patient name"
              name="full_name"
              value={form.full_name}
              onChange={onChange}
              required
            />
            <Field
              label="NRIC"
              name="nric"
              value={form.nric}
              onChange={onChange}
              required
            />
            <Field
              label="Date of birth"
              type="date"
              name="dob"
              value={form.dob}
              onChange={onChange}
              required
              max={TODAY} // ⬅ blocks future dates in calendar
            />
            <Field
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={onChange}
            />
            <Field
              label="Address"
              name="address"
              value={form.address}
              onChange={onChange}
              className="md:col-span-2"
            />
            <Field
              label="Postal code"
              name="postal_code"
              value={form.postal_code}
              onChange={onChange}
            />
          </section>

          {/* Doctor + date + available time slot */}
          <section className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Doctor</label>
              <select
                name="doctor_name"
                value={form.doctor_name}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2 bg-white"
                required
              >
                <option value="">Select a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.full_name} value={d.full_name}>
                    {d.full_name}{" "}
                    {d.slot_minutes ? `(${d.slot_minutes} min)` : ""}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Date"
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              required
              min={TODAY} // optional: don't allow booking in the past
            />

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Time slot</label>
              <select
                name="slot_start_at"
                value={form.slot_start_at}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2 bg-white"
                required
                disabled={!form.doctor_name || !form.date || slots.length === 0}
              >
                <option value="">
                  {form.doctor_name && form.date
                    ? slots.length
                      ? "Select a time…"
                      : "No slots available"
                    : "Choose doctor and date first"}
                </option>
                {slots.map((s) => (
                  <option key={s.start_at} value={s.start_at}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <Field
            label="Reason (optional)"
            name="reason"
            value={form.reason}
            onChange={onChange}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-black text-white rounded-lg px-4 py-2 disabled:opacity-60"
          >
            {loading ? "Booking…" : "Book appointment"}
          </button>
        </form>
      </main>
    </>
  );
}

function Field({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm mb-1">{label}</label>
      <input {...props} className="w-full border rounded-lg px-3 py-2" />
    </div>
  );
}
