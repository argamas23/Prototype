# HealthSync Project 3 Technical Report: Log Meal Flow

Course: S26CS6.401 Software Engineering  
Team: 2  
Prototype focus: Authenticated Log Meal flow  
Submission format: `Project3_2.pdf/zip`

## 1. Overview

HealthSync is an integrated health tracking platform. For Project 3, the prototype demonstrates one nontrivial end-to-end functionality: authenticated meal logging. The flow lets a signed-in user enter meal metadata and food items, preview calculated nutrition totals, submit the meal to a protected FastAPI endpoint, persist the meal in Firestore, and refresh dashboard/history state.

This flow is appropriate for the submission because it exercises the architecture across UI, authentication, API boundary, schema validation, business logic, repository abstraction, persistence, and frontend cache invalidation.

## 2. Requirements and Subsystems

The detailed requirements and subsystem table are in `requirements-and-subsystems.md`.

Key architecturally significant requirements:

- Authenticated users can log meals under their own account.
- Nested meal item data is validated and persisted.
- Backend calculates authoritative totals.
- Dashboard and history data refresh after mutation.
- Writes are scoped by verified Firebase UID.

Main subsystems:

- React meal logging UI.
- Frontend API client.
- Firebase Authentication.
- FastAPI route boundary.
- Pydantic schema validation.
- Meal service layer.
- Firestore repository layer.
- Firestore persistence.

## 3. IEEE 42010 Architecture Framework

The architecture framework is documented in `architecture-framework.md`.

Primary stakeholders:

- HealthSync user.
- Development team.
- Instructor/evaluator.
- Security reviewer.
- Maintainer/operator.

Primary viewpoints:

- User interaction viewpoint.
- Module decomposition viewpoint.
- Architecture documentation viewpoint.
- Security viewpoint.
- Runtime viewpoint.

## 4. Major Design Decisions

ADRs are stored under `adrs/`.

| ADR | Decision |
| --- | --- |
| ADR-0001 | Keep meal form state and validation in a dedicated React page. |
| ADR-0002 | Use an authenticated backend API boundary instead of direct frontend Firestore writes. |
| ADR-0003 | Use a layered backend route/service/repository structure for meal logging. |
| ADR-0004 | Store meals as parent documents with item subcollections in Firestore. |

## 5. Architectural Tactics and Patterns

Detailed tactics and patterns are in `tactics-and-patterns.md`.

Tactics used:

- Authenticate at API boundary.
- Partition data by user ID.
- Validate at multiple boundaries.
- Calculate aggregates server-side.
- Batch database writes.
- Invalidate frontend queries after mutation.
- Log requests with request IDs.

Patterns used:

- Service Layer.
- Repository Pattern.

## 6. Prototype Implementation

Implemented files:

- `frontend/src/pages/LogMeal.tsx`
- `frontend/src/lib/datetime.ts`
- `frontend/src/services/meals.ts`
- `frontend/src/lib/api.ts`
- `backend/app/routes/meals.py`
- `backend/app/schemas/meals.py`
- `backend/app/services/meals_service.py`
- `backend/app/repositories/meals_repo.py`

Runtime flow:

1. User signs in.
2. User opens Log Meal.
3. UI initializes local date/time and a blank item row.
4. User enters meal fields.
5. UI validates and displays live totals.
6. Frontend posts to `POST /api/v1/meals`.
7. Backend verifies Firebase token.
8. Pydantic validates the request.
9. Service calculates totals.
10. Repository provides Firestore references.
11. Service batch-writes meal and item documents.
12. Frontend invalidates dashboard and meals queries and navigates to dashboard.

## 7. Architecture Analysis

Implemented architecture: layered client/server architecture.

Alternative: Firebase-only frontend that writes directly to Firestore.

The implemented architecture has higher setup cost but stronger server-side validation, clearer test boundaries, and better support for future server-side features such as AI nutrition extraction, report generation, imports, exports, or analytics.

Quantification plan:

- Measure `POST /api/v1/meals` response time from browser dev tools. Target p95 under 1 second for 1-5 item meals in a local/dev setup.
- Run automated frontend and backend meal tests. Target frontend service tests under 5 seconds and backend meal tests under 10 seconds.

## 8. Individual Contributions

Replace these placeholders before final submission.

| Team Member | Contributions |
| --- | --- |
| Member 1 | Backend meal API, schema validation, Firestore repository, tests. |
| Member 2 | Frontend Log Meal page, API integration, Firebase auth configuration. |
| Member 3 | ADRs, architecture diagrams, tactics/patterns, analysis/report. |

## 9. Repository Link

Replace with the final GitHub URL before submission:

`https://github.com/<org-or-user>/<repo>`

## 10. Reflection

The Log Meal flow shows why a small prototype still benefits from explicit architectural boundaries. The frontend can focus on usability and immediate feedback, while the backend owns authentication, validation, authoritative totals, and persistence. This separation makes the flow easier to test, explain, and extend.

