// backend/routes/doctors.routes.js
import { Router } from "express";
import {
  listDoctors,
  listDoctorSlots,
  listWeeklyAvailability,
} from "../controllers/doctorscontroller.js";

const r = Router();
r.get("/", listDoctors);
r.get("/slots", listDoctorSlots); // <— NOT "/:id/slots"
r.get("/weekly", listWeeklyAvailability);
export default r;
