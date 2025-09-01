import { Loader, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setOk("");
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include", // receive auth cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");
      setOk(data?.message || "Login successful");
      nav("/home", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Log in</h1>

        {ok && (
          <div className="mb-3 rounded bg-green-50 border border-green-200 text-green-800 px-3 py-2">
            {ok}
          </div>
        )}
        {err && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 text-red-800 px-3 py-2">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <Field
            icon={<Mail size={16} />}
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={onChange}
          />
          <Field
            icon={<Lock size={16} />}
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={onChange}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-black text-white font-medium disabled:opacity-60"
          >
            {loading ? (
              <Loader className="animate-spin mx-auto" size={20} />
            ) : (
              "Log in"
            )}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          New here?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </span>
      <input
        {...props}
        className="w-full border rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
