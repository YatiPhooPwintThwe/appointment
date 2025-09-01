// backend/index.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import { db } from "./config/db.js";
import { protectRoute } from "./middleware/auth.js";

import authRoutes from "./routes/auth.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// API routes
app.use("/api/auth", authRoutes);                          // register, login, logout, me
app.use("/api/appointments", protectRoute, appointmentRoutes); // protected booking/cancel/etc.
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", protectRoute, appointmentRoutes);

// --- Helpers / test routes ---

// DB connectivity
app.get("/test-db", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT NOW() AS now");
    res.json({ success: true, time: rows[0].now });
  } catch (err) {
    console.error("DB connection failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all tables in the current database
app.get("/tables", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY 1"
    );
    res.json(rows.map((r) => r.name));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// helper: check table exists
async function hasTable(name) {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [name]
  );
  return row.ok > 0;
}

// Preview rows from any table: /table/<name>?limit=20
app.get("/table/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
    if (!(await hasTable(name))) return res.status(404).json({ error: "table not found" });
    const [rows] = await db.query(`SELECT * FROM \`${name}\` LIMIT ?`, [limit]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Row count: /table/<name>/count
app.get("/table/:name/count", async (req, res) => {
  try {
    const name = req.params.name;
    if (!(await hasTable(name))) return res.status(404).json({ error: "table not found" });
    const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM \`${name}\``);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
