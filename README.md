# MEDIQUICK — Run & Setup

This file contains the instructions needed to initialize and run the project locally.

- Contributors:
- NAGINENI SAI VINEETH — S20230010159
- MUTYALA SAI PAVAN KUMAR — S20230010157
- NAGOLU SRIMANTH REDDY — S20230010160
- GAJJALA SUDHA HARISH REDDY — S20230010085
- MOOD NARENDAR — S20230010149

Project overview:
- Project name: MEDIQUICK — a telemedicine website combining a React frontend and a Node.js/Express backend with MongoDB.
- Purpose: Manage patients, doctors, suppliers, employees and admins; handle appointments, prescriptions, orders, medicine inventory and basic chat/notifications.

Tech stack:
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- Auth: JWT-based authentication (backend)

Key features (short):
- Role-based accounts: patient, doctor, supplier, employee, admin
- Appointment booking and prescription management
- Medicine inventory, cart and order flows
- User reviews and basic chat
- File uploads for documents and profiles

Folder map (important paths):
- `backend/` — Express server, controllers, models, routes, middlewares
- `FDFED_project_react_app/` — React frontend (Vite)

Prerequisites:
- Node.js (v14+ recommended)
- npm (bundled with Node.js)
- MongoDB

Run steps (use two terminals):

1) Backend

- Open a terminal and run:

```powershell
cd backend
npm install
node app.js
```

2) Frontend (React / Vite)

- Open a second terminal and run:

```powershell
cd FDFED_project_react_app
npm install
npm run dev
```

Notes:
- The frontend dev server (Vite) will display the local URL (commonly http://localhost:5173).
- If `node app.js` fails, ensure dependencies are installed and any required environment variables are set.

Database (MongoDB):
- This project uses MongoDB as its database. Ensure a MongoDB instance is running and reachable before starting the backend.
- Configure the connection via an environment variable (example):

```powershell
set MONGODB_URI="mongodb://localhost:27017/mediquick"
```

Approval & Verification Workflow (one-time verification after signup):
- Users with the role **employee** must be approved by an **admin** after their first sign-in. Admins perform a one-time approval to activate the employee account.
- Users with the roles **doctor** and **supplier** must be verified/approved by an **employee** (employee reviews and approves doctor/supplier accounts).(one-time approval)
- Summary flow:
	- Doctor / Supplier sign up → Employee reviews → Employee approves (one-time)
	- Employee signs up → Admin reviews → Admin approves (one-time)

These approval steps are required for role-specific access in the application.


