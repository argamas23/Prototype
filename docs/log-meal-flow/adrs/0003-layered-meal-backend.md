# ADR-0003: Use a Layered Backend for Meal Logging

## Status

Accepted

## Context

The backend must expose HTTP endpoints, validate request shapes, calculate meal totals, and persist data. Putting all logic in a route handler would be fast initially but harder to test and extend.

## Decision

Use a layered structure:

- `backend/app/routes/meals.py` for HTTP routing and dependency injection.
- `backend/app/schemas/meals.py` for Pydantic request validation.
- `backend/app/services/meals_service.py` for business logic and total calculation.
- `backend/app/repositories/meals_repo.py` for Firestore reference construction.

## Consequences

Positive:

- Business logic can be tested separately from HTTP details.
- Firestore path construction is isolated.
- Future changes such as editing meals or importing nutrition data have clearer extension points.

Negative:

- More files and conventions than a single route handler.
- Developers must keep responsibilities separated consistently.

