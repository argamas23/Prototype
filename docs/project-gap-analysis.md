# HealthSync — Proposal/README/Submission Gap Analysis

This document lists what is already implemented in the repository and what remains to be done, based on:

- `Proposed_Idea.pdf` (project proposal)
- `README.md` (repo status and TODO list)
- `Submission_Guidelines.pdf` (Project 3 deliverables)

## 1) Proposal Requirements (Proposed_Idea.pdf)

### Functional requirements

| Requirement | Status in repo | Where / Notes |
| --- | --- | --- |
| User account management (Auth) | Implemented | Firebase Authentication; backend verifies ID tokens in `backend/app/config/security.py`. |
| Customisable profile | Not implemented | No profile UI/API/storage yet. Candidate: `profile-service` microservice. |
| Meal logging (manual) | Implemented | UI `frontend/src/pages/LogMeal.tsx`, API `POST /api/v1/meals`. |
| Meal logging (upload image) | Implemented (prototype-level) | UI upload in `frontend/src/pages/LogMeal.tsx`, API `POST /api/v1/meals/analyze-image`, ONNX inference in `backend/app/services/image_recognition.py`. |
| Workout tracking (duration, intensity, calories burned) | Implemented | UI `frontend/src/pages/LogWorkout.tsx`, API `POST /api/v1/workouts`. |
| Health goal management (calorie, nutrient, weight targets) | Implemented | UI `frontend/src/pages/Goals.tsx`, API `GET/PUT /api/v1/goals`. |
| Unified health dashboard | Implemented (daily summary) | UI `frontend/src/pages/Dashboard.tsx`, API `GET /api/v1/dashboard`. |
| Progress analytics | Not implemented | No trends/charts endpoints or UI beyond “today”. |
| Personalized workout recommendations | Not implemented | No recommendation engine/service yet. |

### Non-functional requirements

| NFR | Current evidence | Gaps / TODO |
| --- | --- | --- |
| Scalability (multi-user, increasing data) | Per-user partitioning exists (UID-scoped Firestore paths). | Add indexing strategy, pagination UX, load/perf measurements, and service decomposition plan if moving to microservices. |
| Security (user privacy) | Token verification + UID scoping at API boundary. | Remove committed service-account keys from repo; rotate keys; add least-privilege + secret management. |
| Reliability & testability | Unit tests exist for backend and frontend service layers. | Add integration/E2E tests for at least one critical flow; add health/liveness checks per microservice if decomposed. |
| Performance | Batch writes for meals; lightweight API. | Run and record measurements required by submission guidelines (p95 latency, test times). |
| Extensibility/maintainability | Layered backend (routes→services→repos) + frontend services. | If moving to microservices: define service boundaries, contracts, and shared libraries. |

## 2) README TODOs (README.md)

The README contains a backlog of planned features. Current status:

- Implemented: meal logging, workout logging, goals, dashboard, history; image-based meal analysis via `POST /api/v1/meals/analyze-image`.
- Still pending (high-level): automated nutrition parsing, analytics/charts, workout recommendations, profile, editing meals/workouts, weight/water tracking, notifications, import/export, sharing.
- Partially present: backend endpoints accept `page`/`pageSize` and `dateFrom`/`dateTo`, but the History UI does not expose pagination controls or date pickers.

## 3) Project 3 Submission Deliverables (Submission_Guidelines.pdf)

The repo already contains a “Log Meal” focused report set under `docs/log-meal-flow/` that maps to Tasks 1–4.

Remaining items called out by the checklist in `docs/log-meal-flow/submission-checklist.md`:

- Replace “Individual Contributions” placeholders with real names in `docs/log-meal-flow/technical-report-log-meal.md`.
- Add the final GitHub repository link in `docs/log-meal-flow/technical-report-log-meal.md`.
- Run and record final performance/test measurements (latency p95 + test runtime) for the report.
- Export the report Markdown to `Project3_2.pdf` (team 2) and submit as required.

## 4) High-Risk Repo Hygiene / Security TODOs

Before publishing to GitHub or submitting a public link:

- Service account private keys are currently present in the repo (e.g., `backend/healthsync-creds.json`, `backend/security/*.json`). Rotate these credentials in Firebase/GCP and remove them from the repository (and ideally from git history).
- Remove committed Python bytecode caches under `backend/app/config/__pycache__/` etc (they should not be versioned).

## 5) Microservices Migration TODO (if you choose to do it)

If you implement “each feature as microservices”, the main work items are:

- Split the backend into per-feature services (meal/workout/goals/dashboard) with independent deploy/run.
- Add an API gateway (or multiple base URLs) so the frontend can route to the correct service.
- Define service contracts (OpenAPI per service) and shared auth middleware.
- Add resilience tactics (timeouts, circuit breakers, fallbacks) especially for dashboard aggregation.
- Containerize and provide `docker-compose.yml` for local orchestration.

