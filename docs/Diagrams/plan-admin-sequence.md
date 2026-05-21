# Plan Admin — Create Workout Plan (Sequence Diagram)

```mermaid
sequenceDiagram
  actor Admin as Plan Admin
  participant UI as Admin UI (Frontend)
  participant GW as API Gateway
  participant API as Plans API (POST /api/v1/plans/admin)
  participant Auth as PlanAdmin Header Check (X-Plan-Admin-*)
  participant Service as plans_service.create_admin_plan
  participant DB as Firestore (workoutPlans)

  Admin->>UI: Open "Create Plan"
  Admin->>UI: Enter plan details (strategy, exercises, etc.)
  UI->>GW: POST /api/v1/plans/admin (body + X-Plan-Admin-Email + X-Plan-Admin-Token)
  GW->>API: Route request
  API->>Auth: Validate plan-admin headers
  alt Missing/invalid headers
    Auth-->>API: 401 Unauthorized
    API-->>UI: 401 { detail: "PlanAdmin access required" }
    UI-->>Admin: Show unauthorized error
  else Headers valid
    Auth-->>API: admin_email
    API->>Service: create_admin_plan(db, admin_email, body)
    Service->>DB: workoutPlans.document().set(payload)
    DB-->>Service: Stored (id assigned)
    Service-->>API: Plan
    API-->>UI: 200 { data: plan }
    UI-->>Admin: Show created plan
  end
```

## Create Plan (7–8 steps)

1. Plan Admin opens the **Create Plan** screen.
2. Admin enters the workout plan details (title, strategy, exercises, etc.).
3. UI sends `POST /api/v1/plans/admin` with `X-Plan-Admin-Email` and `X-Plan-Admin-Token`.
4. API validates the plan-admin headers (invalid → `401 PlanAdmin access required`).
5. If valid, API calls `create_admin_plan(db, admin_email, body)`.
6. Service writes a new document to Firestore collection `workoutPlans` (adds `ownerEmail`, timestamps).
7. Firestore assigns the document ID and write completes.
8. API returns `200 { data: plan }` and UI shows “plan created”.
