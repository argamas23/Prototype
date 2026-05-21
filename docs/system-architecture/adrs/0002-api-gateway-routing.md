# ADR-0002: Use an API Gateway for Service Routing and a Single Frontend Base URL

## Status

Proposed

## Context

With microservices, the frontend must route API calls to multiple backends. A single `VITE_API_BASE_URL` is currently used.

We want:

- Minimal frontend changes during decomposition.
- Centralized routing and CORS configuration.
- Consistent request/response behavior (e.g., request IDs) across services.

## Decision

Introduce an API gateway (reverse proxy) in front of backend services for local dev and production:

- Routes `/api/v1/meals/*` to `meal-service`, etc.
- Owns CORS configuration.
- Passes through `Authorization` header and propagates `X-Request-ID`.

## Consequences

Positive:

- Frontend continues using a single base URL.
- Routing changes do not require frontend redeploy.
- Central place for rate limiting and basic protections.

Negative:

- Adds a component whose outage affects all APIs (must be HA in production).
- Requires gateway configuration maintenance (routes, timeouts).

