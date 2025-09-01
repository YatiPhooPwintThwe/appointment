import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

function setAuthCookie(res, token) {
  res.cookie("jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/register
// Body: { name, email, password }  // "name" will be stored as "username"
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ message: "name, email, password required" });

    // email unique?
    const [[exists]] = await db.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 10);

    // insert using your columns; timestamps via NOW()
    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [name, email, hash]
    );

    const token = jwt.sign(
      { userId: result.insertId, email, username: name },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );
    setAuthCookie(res, token);
    return res.status(201).json({ message: "Account created" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/login
// Body: { email, password }
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: "email, password required" });

    const [[user]] = await db.query(
      `SELECT user_id, username, email, password_hash
         FROM users WHERE email = ?`,
      [email]
    );
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, username: user.username },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );
    setAuthCookie(res, token);
    return res.json({ message: "Login successful" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (_req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  // req.user is set by protectRoute (see below)
  res.json(req.user);
};
