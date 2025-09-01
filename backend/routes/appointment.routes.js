import { Router } from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  createAppointmentFull,
  myAppointments,
  getAppointment,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
  markNoShow,
} from "../controllers/appointmentcontroller.js";

const r = Router();
r.use(protectRoute); 
r.post("/full", createAppointmentFull);
r.get("/", myAppointments);
r.get("/:id", getAppointment);
r.patch("/:id/cancel", cancelAppointment);      
r.patch("/:id/reschedule", rescheduleAppointment); 
r.patch("/:id/complete", completeAppointment);  
r.patch("/:id/no-show", markNoShow);            

export default r;
