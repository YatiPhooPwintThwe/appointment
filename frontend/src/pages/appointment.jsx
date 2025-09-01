// src/pages/Appointments.jsx
import { useEffect, useState, useCallback} from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../component/navbar"; 
export default function Appointments() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (signal) => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/appointments", { credentials: "include", signal });
      if (res.status === 401) { nav("/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [nav]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);
  return (
    <>
      <NavBar />
      <main className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold">My Appointments</h1>
          <button onClick={() => load()} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
            Refresh
          </button>
        </div>

        {err && <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-800 px-3 py-2">{err}</div>}
        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-600">No appointments yet.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <Th>ID</Th>
                  <Th>Doctor</Th>
                  <Th>Patient</Th>
                  <Th>Start</Th>
                  <Th>End</Th>
                  <Th>Status</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.appointment_id} className="border-t">
                    <Td>{r.appointment_id}</Td>
                    <Td>{r.doctor_name}</Td>
                    <Td>{r.patient_name}</Td>
                    <Td>{fmt(r.start_at)}</Td>
                    <Td>{fmt(r.end_at)}</Td>
                    <Td><Badge>{r.status}</Badge></Td>
                    <Td>{r.reason || "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function Th({ children }) { return <th className="text-left text-sm font-medium text-gray-600 px-3 py-2">{children}</th>; }
function Td({ children }) { return <td className="text-sm px-3 py-2">{children}</td>; }
function Badge({ children }) { return <span className="inline-block px-2 py-0.5 rounded text-xs border">{children}</span>; }
function fmt(s) {
  if (!s) return "";
  const d = new Date(s);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
