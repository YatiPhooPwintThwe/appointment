// component/navbar.jsx
import { CalendarCheck, LogOut, PlusCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";


export default function NavBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const isAppointments = pathname.startsWith("/appointments");
  const isCreate = pathname.startsWith("/create");

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      nav("/login");
    }
  }

  const btn =
    "inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-gray-50";
  const active = "bg-gray-50 border-gray-300";

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
      {/* normal height + full content width like your reference */}
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Left: logo (small, left corner) + title with spacing */}
        <Link to="/home" className="flex gap-3 min-w-0" aria-label="Home">
        
          <span className="text-2xl font-bold ">Carat booking</span>
        </Link>

        {/* Right: actions with comfortable horizontal gaps */}
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/create"
            className={`${btn} ${isCreate ? active : ""}`}
            aria-label="New appointment"
            title="New appointment"
          >
            <PlusCircle className="h-5 w-5" />
          </Link>

          <Link
            to="/appointments"
            className={`${btn} ${isAppointments ? active : ""}`}
            aria-label="Appointments"
            title="Appointments"
          >
            <CalendarCheck className="h-5 w-5" />
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-3 py-2 text-sm hover:bg-rose-50"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
