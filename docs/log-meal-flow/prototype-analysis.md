# Task 4: Prototype Implementation and Architecture Analysis

## Implemented Prototype Scope

The implemented nontrivial end-to-end flow is Log Meal:

- UI: `frontend/src/pages/LogMeal.tsx`
- Frontend API service: `frontend/src/services/meals.ts`
- Authenticated fetch helper: `frontend/src/lib/api.ts`
- Backend route: `backend/app/routes/meals.py`
- Backend schema: `backend/app/schemas/meals.py`
- Backend service: `backend/app/services/meals_service.py`
- Backend repository: `backend/app/repositories/meals_repo.py`
- Persistence: Firestore under `users/{uid}/meals/{mealId}` and `items` subcollection.

## Architecture Implemented

HealthSync uses a layered client/server architecture:

```text
React page
  -> frontend service
    -> authenticated API request
      -> FastAPI route
        -> Pydantic schema
          -> service layer
            -> repository
              -> Firestore
```

## Alternative Architecture Compared

Alternative: Firebase-only frontend, where the React app writes meal documents directly to Firestore using client SDK calls and Firebase Security Rules.

| Concern | Implemented Layered API | Firebase-only Frontend |
| --- | --- | --- |
| Security | Backend verifies token and scopes writes using trusted Admin SDK. | Security depends heavily on client SDK usage and Firestore Security Rules. |
| Data integrity | Backend calculates totals and validates schema before writing. | Client-side logic may become the source of truth unless duplicated in Cloud Functions/rules. |
| Maintainability | Business logic sits in Python service modules and can be tested separately. | Logic can spread across UI components and hooks. |
| Delivery speed | Requires running frontend and backend. | Faster for simple CRUD prototypes. |
| Future integration | Backend can later add AI nutrition parsing, imports, or analytics behind same API. | Advanced server-side workflows require extra Firebase services or later migration. |

## Quantification for Non-Functional Requirements

Use these measurements in the final report after running them locally with the backend and frontend configured.

| NFR | Metric | Target | Current Evidence / How to Measure |
| --- | --- | --- | --- |
| LM-NFR-4 Performance | Meal save response time | p95 under 1 second for a common meal of 1-5 items in local/dev setup. | Open browser dev tools Network tab, submit 5 sample meals, record `POST /api/v1/meals` durations, and compute p95. |
| LM-NFR-5 Testability | Automated regression time | Frontend service tests complete under 5 seconds; backend meal tests complete under 10 seconds. | Run `npm.cmd test` in `frontend`; run `pytest tests/test_meals_service.py tests/test_meals_routes.py -v` in `backend`. |
| LM-NFR-2 Data integrity | Invalid input rejection | 100% of negative calories/quantity cases rejected. | Frontend prevents submit; backend Pydantic `Field(..., ge=0)` rejects invalid API payloads. |

## Observed Verification

During frontend verification, `npm.cmd run build` and `npm.cmd test` passed after dependencies were installed and esbuild was allowed to spawn. The build produced a chunk-size warning unrelated to Log Meal functionality.

## Trade-Offs

- The backend layer adds setup complexity but improves validation, security, and future extensibility.
- Firestore subcollections fit nested meal items naturally, but list reads require fetching item subcollections for full meal detail.
- Client-side live totals improve user confidence, but backend totals remain authoritative.
- React Query invalidation keeps the UI fresh, but developers must remember to invalidate all affected query keys after mutations.

