# BoatiesMate — Marina Booking & Mooring Demo Prototype

BoatiesMate is an investor-ready Node/Express prototype demonstrating a modern,
mobile-first booking workflow between:

- **Boaties (vessel owners)** requesting a berth/mooring
- **Marina operators** reviewing and approving bookings

This prototype is designed to show **time savings**, **reduced admin effort**,
and a more seamless compliance-aware booking experience.

---

## 🌍 Live Public Demo (Render)

Demo Control Panel:

https://boatiesmate-demo.onrender.com

Health Check:

https://boatiesmate-demo.onrender.com/healthz

---

## 🎛 Demo Control Panel Features

From the Control Panel you can:

- Launch Boatie Booking Demo
- Launch Operator Inbox
- Open Operator Review by Booking ID
- Switch between demo operators (Gulf Harbour / Westhaven)

---

## 🔐 Demo Reset & Baseline Safety

The prototype includes investor-safe demo controls:

- `POST /api/demo/reset` — restores bookings to baseline
- `POST /api/demo/baseline` — saves current dataset as new baseline

### Production Protection

On the public deployment, these endpoints require:

- Header: `X-Demo-Admin-Key`

Reset is blocked without the admin key.

---

## ▶ Run Locally (Developer Mode)

### 1. Install dependencies

npm install

### 2. Start the server

npm start

Then open:

http://127.0.0.1:3000

---

## 📌 Phase Status

- Phase 12: Investor Demo Packaging ✅
- Phase 13: Public Hosting + Deployment Safety ✅

Next phases will focus on:

- Database-backed persistence (Postgres)
- Real authentication & roles
- True availability/capacity rules
- Uploadable compliance documents
- Multi-marina scaling

---

## Disclaimer

This is a demonstration prototype intended for investor/operator walkthroughs.
Not production-ready software yet.
