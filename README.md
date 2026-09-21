# Centurion University of Technology and Management (CUTM) Result Portal

A production-grade, full-stack academic examination result publication, calculation, and verification web application built for **Centurion University of Technology and Management (CUTM)**.

---

## 🌟 Key Capabilities

### 🎓 Student Result Experience
- **Instant Result Lookup**: Search by Registration Number (e.g. `24CSE12345`) and Semester number (1 through 8).
- **Automated SGPA Calculation**: Dynamically computed server-side from subject credits and grade points:
  $$\text{SGPA} = \frac{\sum (\text{Credits} \times \text{Grade Point})}{\sum \text{Credits}}$$
- **Automated Cumulative CGPA Calculation**: Computed across all completed semesters:
  $$\text{CGPA} = \frac{\sum (\text{All Semester Credits} \times \text{Grade Point})}{\sum \text{All Semester Credits}}$$
- **Interactive SGPA Progression**: Visual growth curve powered by Recharts.
- **Provisional Marksheet Export**: High-resolution print-friendly layout and downloadable digital PDF with QR code representation.
- **Confetti Celebration**: Smooth celebratory particle animation on high SGPA ($\ge 8.5$).

### 🛡️ Administrative Portal & Security
- **JWT & HTTP-Only Authentication**: Secure admin logins with bcrypt password hashing and IP rate limiting to prevent brute-force attacks.
- **Bulk CSV / Excel (.xlsx) Ingestion**:
  - 2-Phase validation engine: checks column headers, data types, credits range, letter grade scales, and duplicate detection.
  - Interactive validation preview modal (Rows detected, Valid rows, Invalid rows with error summary, Duplicate rows).
  - Atomic transactional database commit with rollback safety.
- **Student Roster & Results CRUD**: Search, filter by branch/semester/session, add, edit, single delete, and bulk delete results.
- **Dynamic Grade Point Scale Manager**: Real-time configurable grade mapping (O, E, A+, A, B+, B, C, D, F, M) allowing instant university-wide recalculation.
- **Immutable Audit Trail**: Tracks all logins, uploads, edits, deletes, and configuration adjustments with timestamps and IP logging.
- **Role-Based API Protection**: Strict server-side authorization on all mutation routes.

---

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion, Recharts, jsPDF, html2canvas, canvas-confetti.
- **Backend**: Python 3.13+, FastAPI, SQLAlchemy, Pydantic v2, Uvicorn, Python-Jose (JWT), Bcrypt, Pandas, OpenPyXL.
- **Database**: PostgreSQL (Production) / SQLite (Local Zero-Config).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run initial seed script (populates realistic demo students & baseline admin)
python -m app.seed

# Start FastAPI backend server
uvicorn app.main:app --reload --port 8000
```
Backend API will be live at: `http://localhost:8000`  
Interactive Swagger Docs at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend UI will be live at: `http://localhost:5173`

---

## 🔐 Demo Credentials

| Role | Username / Email | Password |
|------|-----------------|----------|
| **Super Admin** | `admin@cutm.ac.in` (or `admin`) | `Admin@CUTM2026` |

### 👨‍🎓 Sample Student Registration Numbers for Instant Testing
- `24CSE12345` (Semester 3 - Shubham Kumar Jha, CSE-AIML)
- `24CSE10001` (Semester 3 - Ananya Patnaik, CSE)
- `24ECE10022` (Semester 2 - Rohan Mohanty, ECE)
- `24MECH1005` (Semester 1 - Priya Ranjan Das, ME)

---

## 📁 Sample Bulk Upload Files
Sample files for testing the bulk ingestion engine are located in `sample_data/`:
- `sample_data/cutm_sample_results.csv`
- `sample_data/cutm_sample_results.xlsx`

---

## 🌐 Production Cloud Deployment Guide

### Database (Neon / Supabase / Render PostgreSQL)
1. Provision a PostgreSQL instance on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection string (e.g., `postgresql://user:pass@host/cutm_results?sslmode=require`).
3. Set the `DATABASE_URL` environment variable in your backend hosting service.

### Backend (Render / Railway / Fly.io)
1. Connect your Git repository.
2. Root Directory: `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set Environment Variables:
   - `DATABASE_URL` = `<your-postgresql-url>`
   - `JWT_SECRET` = `<your-secure-random-secret>`
   - `CORS_ORIGINS` = `https://your-frontend.vercel.app`

### Frontend (Vercel / Netlify / Cloudflare Pages)
1. Connect your Git repository.
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure reverse proxy or set API URL to point to your backend.

---

## 🧪 Automated Testing
Run the backend test suite:
```bash
cd backend
python -m pytest
```

---

## 📄 License
Centurion University of Technology and Management Academic Software. All Rights Reserved.
