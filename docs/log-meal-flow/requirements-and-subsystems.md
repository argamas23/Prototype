# Task 1: Requirements and Subsystems

## Functional Requirements

| ID | Requirement | Architecturally Significant? | Rationale |
| --- | --- | --- | --- |
| LM-FR-1 | Authenticated users shall log a meal with meal type, date, time, and one or more food items. | Yes | The flow crosses identity, UI validation, HTTP API, backend validation, and persistence. |
| LM-FR-2 | Each food item shall include name, quantity, unit, calories, protein, carbs, and fat. | Yes | The nested item structure influences API schema, storage model, and UI layout. |
| LM-FR-3 | The frontend shall compute and display a live nutrition summary before submission. | No | Improves usability, but backend still owns persisted totals. |
| LM-FR-4 | The backend shall calculate meal totals from submitted items before saving. | Yes | Prevents the client from becoming the source of truth for aggregate nutrition values. |
| LM-FR-5 | The system shall associate each meal with the authenticated user's data partition. | Yes | Drives authorization and repository path design. |
| LM-FR-6 | After a successful save, dashboard and meal history data shall refresh. | Yes | Requires explicit frontend cache invalidation. |

## Non-Functional Requirements

| ID | Quality Attribute | Requirement | Architectural Significance |
| --- | --- | --- | --- |
| LM-NFR-1 | Security | `POST /api/v1/meals` must reject unauthenticated requests and must write only under the authenticated user's UID. | Central to API boundary and repository path design. |
| LM-NFR-2 | Data Integrity | Quantity and nutrition values must be non-negative. | Enforced in both frontend parsing and Pydantic backend validation. |
| LM-NFR-3 | Usability | Meal entry must work on mobile and desktop without horizontal scrolling. | Drives responsive grid layout in `LogMeal.tsx`. |
| LM-NFR-4 | Performance | Saving a prototype meal should complete within 1 second on a local/dev Firestore connection for common meal sizes. | Drives use of Firestore batch writes instead of many independent commits. |
| LM-NFR-5 | Maintainability | UI, API client, HTTP route, business logic, and Firestore access must be separated. | Allows unit testing and easier future changes such as editing meals or importing nutrition data. |
| LM-NFR-6 | Observability | Backend requests should be logged with duration and request ID. | Supports debugging failed saves and latency issues. |

## Subsystem Overview

| Subsystem | Components | Role in Log Meal Flow |
| --- | --- | --- |
| Meal Logging UI | `frontend/src/pages/LogMeal.tsx`, `frontend/src/lib/datetime.ts` | Captures meal details, validates client-side fields, computes live totals, and triggers save. |
| Frontend API Client | `frontend/src/services/meals.ts`, `frontend/src/lib/api.ts` | Serializes request payload and attaches Firebase bearer token. |
| Authentication | Firebase client SDK, `backend/app/config/security.py` | Provides ID token and verifies current user on protected routes. |
| API Boundary | `backend/app/routes/meals.py` | Exposes `POST /api/v1/meals` and injects user/database dependencies. |
| Schema Validation | `backend/app/schemas/meals.py` | Validates meal type, date/time, nested food items, and non-negative nutrition fields. |
| Business Logic | `backend/app/services/meals_service.py` | Calculates totals, prepares persisted payloads, and coordinates batch writes. |
| Data Access | `backend/app/repositories/meals_repo.py` | Encapsulates Firestore paths for user meals and meal item subcollections. |
| Persistence | Firebase Firestore | Stores meal documents and nested item documents under each user. |

