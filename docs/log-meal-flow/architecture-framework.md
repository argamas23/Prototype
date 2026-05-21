# Task 2: IEEE 42010 Architecture Framework

## Stakeholders, Concerns, Viewpoints, and Views

| Stakeholder | Concerns | Viewpoint | View Used in This Artifact |
| --- | --- | --- | --- |
| HealthSync user | Fast meal entry, accurate totals, private health data, mobile usability. | User interaction viewpoint | Meal logging UI flow and validation behavior. |
| Developer team | Clear responsibilities, testable logic, easy extension to edit/import meals. | Module decomposition viewpoint | Frontend service + FastAPI route + service + repository module view. |
| Instructor/evaluator | Evidence of requirements, ADRs, tactics, patterns, and analysis. | Architecture documentation viewpoint | Report, ADRs, diagrams, and analysis tables. |
| Security reviewer | Authenticated access, user isolation, safe Firebase credential handling. | Security viewpoint | Firebase token verification and per-user Firestore path view. |
| Maintainer/operator | Debuggability, response timing, setup clarity, environment variables. | Runtime viewpoint | API request/response and observability view. |

## Context View

```mermaid
C4Context
title HealthSync Log Meal Context
Person(user, "Authenticated User", "Logs meals and reviews nutrition totals")
System(frontend, "React Frontend", "Meal logging screen and API client")
System(api, "FastAPI Backend", "Protected meal API and business logic")
System_Ext(auth, "Firebase Authentication", "Issues and verifies ID tokens")
System_Ext(db, "Firestore", "Stores per-user meal data")
Rel(user, frontend, "enters meal details")
Rel(frontend, auth, "signs in and obtains ID token")
Rel(frontend, api, "POST /api/v1/meals with bearer token")
Rel(api, auth, "verifies ID token")
Rel(api, db, "writes meal and item documents")
```

## Module View

```mermaid
flowchart LR
  LogMeal[LogMeal.tsx] --> MealService[frontend services/meals.ts]
  MealService --> ApiFetch[apiFetch]
  ApiFetch --> Route[FastAPI meals route]
  Route --> Auth[get_current_user]
  Route --> Schema[LogMealRequest]
  Route --> Service[meals_service.log_meal]
  Service --> Repo[meals_repo]
  Repo --> Firestore[(Firestore)]
```

## Runtime Sequence View

```mermaid
sequenceDiagram
  actor User
  participant UI as LogMeal.tsx
  participant APIClient as logMeal/apiFetch
  participant API as POST /api/v1/meals
  participant Auth as Firebase Auth Verification
  participant Service as meals_service.log_meal
  participant DB as Firestore

  User->>UI: Enter meal and food items
  UI->>UI: Validate fields and show live totals
  UI->>APIClient: logMeal(payload)
  APIClient->>API: POST payload + Bearer token
  API->>Auth: Verify ID token
  Auth-->>API: AuthUser(uid)
  API->>Service: log_meal(db, uid, body)
  Service->>Service: Calculate totals
  Service->>DB: Batch write meal + item documents
  DB-->>Service: Commit success
  Service-->>API: Saved meal with items
  API-->>APIClient: { data: meal }
  APIClient-->>UI: Meal
  UI->>UI: Invalidate dashboard/meals, toast, navigate
```

## Security View

- The frontend never uses the Firebase Admin SDK service account.
- The frontend obtains a Firebase ID token from the signed-in browser user.
- `apiFetch` sends `Authorization: Bearer <token>`.
- `get_current_user` verifies the token on the backend.
- The route passes `user.uid` into `meals_service.log_meal`.
- `meals_repo.meals_ref(db, uid)` stores under `users/{uid}/meals`.

