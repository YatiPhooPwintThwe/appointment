import { mailtrapClient, sender } from "../mailtrap/mailtrap.config.js"; 

export async function sendBookingEmail(toEmail, { doctorName, start_time, end_time }) {
  const html = `
    <h2>Appointment Confirmed</h2>
    <p>Doctor: <b>${doctorName}</b></p>
    <p>From: ${start_time}</p>
    <p>To: ${end_time}</p>
    <p>Thanks for using Carat Booking!</p>
  `;
  try {
    await mailtrapClient.send({
      from: sender,
      to: [{ email: toEmail }],
      subject: "Your appointment is confirmed",
      html,
      category: "Appointment",
    });
  } catch (e) {
    console.warn("Email failed (non-blocking):", e.message);
  }
}
