Carat Booking — Doctor Appointments

A simple appointment system with default weekly schedules, doctor leave management, and email notifications.

Features

📆 Browse & book available time slots by doctor and day

🩺 Default weekly schedule per doctor (e.g., Mon–Fri 09:00–12:00, 13:00–17:00)

🛫 Doctor leave (set in MySQL): leave days/times are blocked during booking

✉️ Email confirmations via Mailtrap after a successful booking


Pages (UI)

Home – shows the weekly schedule for each doctor (ignores leave for display only)

Create (Book) – book an appointment; only actually available slots are selectable

View (Appointments) – see your appointments + statuses (e.g., confirmed/cancelled)

Screenshot (Weekly Schedule)

<img width="1280" height="590" alt="image" src="https://github.com/user-attachments/assets/f33b5b60-ce00-477c-8a00-cae89c951c7a" />



How “Doctor Leave” Works

Admin sets leave in MySQL Workbench (e.g., table doctor_leave: doctor_id, leave_date, start_time, end_time, reason).

During booking, the API excludes any time that overlaps leave ⇒ those slots are disabled in the UI. We won't be able to select time slot if we choose the date out of doctor's availability or if the doctor took leave on that day.

<img width="1280" height="851" alt="image" src="https://github.com/user-attachments/assets/37d9e621-5e6a-477a-9ee3-5716da6b0c58" />


<img width="1280" height="913" alt="image" src="https://github.com/user-attachments/assets/8a958ab6-8d69-4247-97d1-ae4097a9ec3d" />

confirmation after completion:
<img width="2345" height="356" alt="image" src="https://github.com/user-attachments/assets/79b2d823-97bd-405a-ad58-11adabb62304" />

Email

Confirmation (on successful booking): subject “Your appointment is confirmed”
<img width="969" height="836" alt="image" src="https://github.com/user-attachments/assets/533b4fc1-ffe5-4840-b0d8-abf4ea84e05b" />



