# ADR-0002: Use an Authenticated Backend API Boundary for Meal Logging

## Status

Accepted

## Context

Meal data is private health-related information. The system must ensure that only authenticated users can save meals and that each meal is associated with the correct user. One option was to let the frontend write directly to Firestore. Another option was to route writes through the FastAPI backend.

## Decision

Send meal writes through `POST /api/v1/meals`. The frontend obtains the Firebase ID token and `apiFetch` sends it as a bearer token. The backend verifies the token through `get_current_user` and passes the verified `uid` to the meal service.

## Consequences

Positive:

- Authentication and authorization are enforced at a trusted backend boundary.
- Backend can centralize validation, logging, and future business rules.
- Firestore Admin SDK access remains server-side only.

Negative:

- The local prototype requires both frontend and backend servers.
- The API boundary adds latency compared with direct client writes.

