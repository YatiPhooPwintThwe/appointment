import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export async function protectRoute(req, res, next) {
  try {
    const token = req.cookies?.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const { userId } = jwt.verify(token, process.env.JWT_SECRET || "devsecret");

    const [[u]] = await db.query(
      `SELECT user_id, username, email FROM users WHERE user_id = ?`,
      [userId]
    );
    if (!u) return res.status(404).json({ message: "User not found" });

    // normalize to the shape your other code expects:
    req.user = {
      id: u.user_id,              // so controllers using req.user.id keep working
      name: u.username,           // optional
      email: u.email,
    };

    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
