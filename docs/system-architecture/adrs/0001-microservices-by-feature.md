# ADR-0001: Adopt Feature-Aligned Microservices for HealthSync Backend

## Status

Proposed

## Context

The current backend is a single FastAPI application containing multiple feature areas (meals, workouts, goals, dashboard). The project proposal and README include additional planned features (analytics, recommendations, profile, notifications).

A key reliability goal is partial availability: if one feature’s backend is unavailable, the rest of the system should continue operating.

## Decision

Evolve from a single backend to feature-aligned microservices:

- `meal-service`
- `workout-service`
- `goals-service`
- `dashboard-service`

Additional services (profile/analytics/recommendations/notifications/export) are planned as separate services when implemented.

## Consequences

Positive:

- Better failure isolation between features.
- Independent scaling/deployments per feature.
- Clearer ownership boundaries per API and persistence model.

Negative:

- Increased operational complexity (multiple services, logging/tracing, config management).
- More cross-cutting duplication (auth middleware, Firestore init) unless a shared library is introduced.
- Aggregation endpoints (dashboard/analytics) require resilience tactics or read-model approaches.

