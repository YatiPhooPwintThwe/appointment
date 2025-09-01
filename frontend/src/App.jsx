// src/App.jsx
import "./index.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Create from "./pages/createpage.jsx";
import Home from "./pages/homepage.jsx";
import Appointments from "./pages/appointment.jsx";
import LoginPage from "./pages/login.jsx";
import SignUpPage from "./pages/signup.jsx";

export default function App() {
  return (
    <Routes>
      {/* Default = login */}
      <Route path="/" element={<LoginPage />} />

      {/* App pages */}
      <Route path="/home" element={<Home />} />
      <Route path="/create" element={< Create />} />
      <Route path="/appointments" element={<Appointments />} />

      {/* Auth */}
      <Route path="/signup" element={<SignUpPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
