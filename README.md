# HealthSync

**S26CS6.401 Software Engineering, Project 3**

**Team 2**

An integrated health tracking platform that lets users monitor nutrition, workouts, and fitness goals in one place.

---

## Overview

HealthSync replaces the need for multiple fragmented apps by combining **meal logging**, **workout tracking**, and **health goal management** into a single, unified system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| State / Data | TanStack React Query |
| Routing | React Router v6 |
| Backend | FastAPI (Python) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (email + Google) |
| Testing (BE) | pytest + pytest-mock |
| Testing (FE) | Vitest |

---

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── config/         # Settings, Firebase init, auth middleware, logging
│   │   ├── repositories/   # Firestore collection helpers (meals, workouts, goals)
│   │   ├── routes/         # FastAPI routers (meals, workouts, dashboard, goals, health)
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── services/       # Business logic layer
│   │   └── utils/          # Firestore serialization helpers
│   ├── tests/              # pytest unit tests (services layer)
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/     # AppLayout, AppSidebar
    │   │   ├── shared/     # StatCard
    │   │   └── ui/         # shadcn/ui primitives (do not modify)
    │   ├── contexts/       # AuthContext
    │   ├── pages/          # Auth, Dashboard, LogMeal, LogWorkout, History, Goals
    │   ├── services/       # API call functions (meals, workouts, dashboard, goals, auth)
    │   ├── tests/          # Vitest unit tests (service layer)
    │   └── types/          # health.ts — shared TypeScript types
    ├── .env.example
    └── package.json
```

---

## API Endpoints

```
GET  /health                      Health check

POST /api/v1/meals/analyze-image  Analyze a meal photo (returns suggested meal items)
POST /api/v1/meals                Log a meal (with items)
GET  /api/v1/meals                List meals (dateFrom, dateTo, page, pageSize)
PUT  /api/v1/meals/:id            Update a meal
DEL  /api/v1/meals/:id            Delete a meal

POST /api/v1/workouts             Log a workout
GET  /api/v1/workouts             List workouts (dateFrom, dateTo, page, pageSize)
PUT  /api/v1/workouts/:id         Update a workout
DEL  /api/v1/workouts/:id         Delete a workout

GET  /api/v1/dashboard?date=      Today's summary (calories, macros, workouts)

GET  /api/v1/goals                Get active goal
PUT  /api/v1/goals                Set/update active goal

GET  /api/v1/profile              Get user profile
PUT  /api/v1/profile              Set/update user profile

GET  /api/v1/analytics/daily      Daily progress analytics (dateFrom, dateTo)
```

All `/api/v1/*` routes require a Firebase ID token as `Authorization: Bearer <token>`.

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Firebase project with **Firestore** and **Authentication** enabled

### Troubleshooting

- **“Failed to fetch” when saving meals/goals/workouts** usually means the frontend can’t reach the API.
  - Verify the backend is running: `curl http://127.0.0.1:8000/health` should return `{"status":"ok"}`.
  - Ensure `frontend/.env` has `VITE_API_BASE_URL=http://127.0.0.1:8000` (some systems resolve `localhost` to IPv6 `::1`).
  - If the backend is running but the browser console shows a CORS error, update `backend/.env` `ALLOWED_ORIGINS` to match your frontend origin (common dev origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://[::1]:5173`).

---

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — fill in your Firebase credentials and service account key path
```

#### Run Backend

The original single-process FastAPI app still exists for reference/debugging:

```bash
uvicorn app.main:app --reload
# API available at http://127.0.0.1:8000
# Swagger docs at http://127.0.0.1:8000/docs
```

#### Running Backend Tests

```bash
cd backend
pytest tests/ -v
```

---

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — fill in your Firebase config and set VITE_API_BASE_URL=http://127.0.0.1:8000
# Restart the frontend dev server after editing .env

# Run the dev server
npm run dev
# App available at http://localhost:5173
```

#### Running Frontend Tests

```bash
cd frontend
npm test
```

---

## Implemented Features

- **Authentication** — Email/password and Google sign-in via Firebase Auth
- **Meal Logging** — Meal type/date/time + multi-item entries (optional image analysis)
- **Workout Logging** — One session with one or more exercises (cardio/strength/yoga/etc.)
- **Unified Dashboard** — Today’s overview plus edit/delete for today’s logged meals/workouts
- **History** — Tabbed meals/workouts history
- **Health Goals** — Set daily calorie and macronutrient targets, plus target weight
- **Profile** — Personal details plus dietary preferences/allergies validation
- **Progress Analytics** — Multi-color trends and breakdown charts for calories/macros/workouts
