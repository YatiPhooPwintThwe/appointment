import { useEffect, useMemo, useState } from "react";
import NavBar from "../../component/navbar.jsx";

const DAY_LABEL = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
const DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function Home() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch("/api/doctors/weekly");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load weekly availability");
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map(); // full_name -> { slot_minutes, days: {1:[ "09:00-12:00", ...] } }
    for (const r of rows) {
      if (!map.has(r.full_name)) map.set(r.full_name, { slot_minutes: r.slot_minutes, days: {} });
      const g = map.get(r.full_name);
      if (r.day_of_week) {
        const label = `${r.start_time}–${r.end_time}`;
        (g.days[r.day_of_week] ||= []).push(label);
      }
    }
    for (const v of map.values()) {
      for (const d of Object.keys(v.days)) v.days[d].sort();
    }
    return map;
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50">
          
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 pt-16 pb-18 space-y-8">
        {/* Page header */}
        <header className="space-y-8">
          <h1 className="text-3xl font-semibold tracking-tight">Doctors — Default Weekly Schedule</h1>
          <p className="text-sm text-gray-600">
            This shows each doctor’s usual days and time ranges (ignores leave). When booking, only actually
            available slots will be selectable.
          </p>
        </header>

        {/* Messages */}
        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3">
            {err}
          </div>
        )}
        {loading && <p className="text-gray-600 mt-2">Loading…</p>}
        {!loading && grouped.size === 0 && <p className="text-gray-600 mt-2">No doctors found.</p>}

        {/* Table card */}
        {!loading && grouped.size > 0 && (
          <div className="overflow-x-auto rounded-2xl border bg-white/70 backdrop-blur shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <Th>Doctor</Th>
                  {DAYS.map((d) => (
                    <Th key={d}>{DAY_LABEL[d]}</Th>
                  ))}
                  <Th className="text-right">Slot</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...grouped.entries()].map(([name, info], idx) => (
                  <tr key={name} className={idx % 2 ? "bg-gray-50/40" : "bg-white"}>
                    <Td className="font-medium">{name}</Td>
                    {DAYS.map((d) => (
                      <Td key={d}>
                        {info.days[d]?.length ? (
                          <div className="space-y-1">
                            {info.days[d].map((t) => (
                              <div key={t} className="inline-flex items-center rounded border px-2 py-0.5 text-xs">
                                {t}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </Td>
                    ))}
                    <Td className="text-right">{info.slot_minutes ? `${info.slot_minutes} min` : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`text-left text-xs font-semibold uppercase tracking-wide text-gray-600 px-4 py-3 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`text-sm px-4 py-3 align-top ${className}`}>{children}</td>;
}
