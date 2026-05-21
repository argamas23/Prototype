# ADR-0003: Make Dashboard Responses Degrade Gracefully Under Partial Outages

## Status

Proposed

## Context

The dashboard aggregates meals and workouts. In a microservices architecture, a naive approach would call other services synchronously; if any dependency times out, the dashboard fails.

The “services are independent” requirement implies the dashboard should continue to work when some upstreams are down, even if the response is partial.

## Decision

Implement the dashboard as a resilient read API:

- Time-bound each upstream dependency (timeouts).
- Use circuit breakers to avoid cascading failures.
- Return a partial response with explicit “missing” fields when a dependency is unavailable.

When using a shared datastore (Firestore), the dashboard may query required read-only data directly as a fallback to avoid coupling to upstream services for basic aggregation.

## Consequences

Positive:

- Improves perceived reliability: users can still see what is available.
- Prevents cascading failures from taking down the dashboard.

Negative:

- Requires careful API design for partial responses.
- Optional direct datastore reads can weaken strict “service owns data” boundaries (trade-off accepted for availability in this project scope).

