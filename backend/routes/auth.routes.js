import { Router } from "express";
import { register, login, logout, me } from "../controllers/authcontroller.js";
import { protectRoute } from "../middleware/auth.js";

const r = Router();
r.post("/register", register);
r.post("/login", login);
r.post("/logout", logout);
r.get("/me", protectRoute, me);
export default r;
