# NFR Narrative — Patterns & Principles

A presentation-ready map from each non-functional requirement to the
concrete artefact in the codebase and the named pattern or SOLID principle
it embodies. Each row is one slide bullet.

---

## 1. Scalability

| What we did | Pattern / principle | File (entry point) |
|---|---|---|
| In-memory TTL cache with pluggable Redis backend fronting dashboard + analytics reads | **Cache-Aside Pattern**; **Dependency Inversion Principle** (services depend on `Cache` protocol, not a concrete backend) | [backend/app/config/cache.py](backend/app/config/cache.py) |
| Push date filtering into Firestore instead of streaming-then-discarding client-side | **Predicate push-down** | [backend/app/services/meals_service.py:88](backend/app/services/meals_service.py#L88), [backend/app/services/workouts_service.py](backend/app/services/workouts_service.py) |
| Composite Firestore indexes for `(date, __name__)` on meals + workouts | Deploy-time scaling hint | [firestore.indexes.json](firestore.indexes.json) |
| Stateless services (DB client per-request via `Depends`, no in-process session state) — pre-existing | **Shared-Nothing Architecture** | [backend/app/config/firebase.py](backend/app/config/firebase.py) (also wired into the per-service apps on the **`comparison`** branch) |

**Talking point:** *"Reads go through a pluggable cache; writes invalidate keyed entries; the services never know whether they're talking to a dict or to Redis — DIP at work."*

---

## 2. Performance

| What we did | Pattern / principle | File |
|---|---|---|
| Removed the **N+1 query** in meal listing — items now denormalized inside the meal document; legacy rows fall back to sub-collection reads | **Denormalization for read-heavy workloads**; awareness of **query-complexity costs** | [backend/app/services/meals_service.py:40-97](backend/app/services/meals_service.py#L40) |
| Offloaded ONNX inference (CPU-bound, ~hundreds of ms) to a thread-pool via `asyncio.to_thread` | **Non-blocking I/O principle** — keep the event loop free | [backend/app/services/meals_service.py:139](backend/app/services/meals_service.py#L139) |
| Route-level **code-splitting** on the frontend — every page becomes its own chunk | Bundle-size optimization | [frontend/src/App.tsx](frontend/src/App.tsx) |

**Before/after signal:** listing *N* meals used to issue *N + 1* Firestore reads; it now issues *1*. The theoretical ceiling is 100× fewer reads at the paginated cap.

---

## 3. Extensibility

| What we did | Pattern / principle | File |
|---|---|---|
| Replaced the hard-coded nutrition fallback chain with a `NutritionProvider` protocol + three concrete strategies composed by `NutritionResolver` | **Strategy Pattern + Chain-of-Responsibility**; **Open/Closed Principle** — adding a USDA provider = new class, no edits elsewhere | [backend/app/services/nutrition/providers.py](backend/app/services/nutrition/providers.py) |
| Pluggable cache backend (see Scalability) | Same OCP + DIP story applied to infrastructure | [backend/app/config/cache.py](backend/app/config/cache.py) |
| `useApi` / `useApiMutation` hooks on the frontend — pages depend on the hook, not on `apiFetch` directly | **Dependency Inversion Principle** — swap the HTTP layer in one place | [frontend/src/hooks/useApi.ts](frontend/src/hooks/useApi.ts) |

**OCP evidence:** [backend/tests/test_nutrition_resolver.py](backend/tests/test_nutrition_resolver.py) — the `test_open_closed_extension_via_new_provider` test plugs in a brand-new `SushiProvider` without touching any existing class.

---

## 4. Maintainability

| What we did | Pattern / principle | File |
|---|---|---|
| Custom domain exception hierarchy (`MealNotFound`, `WorkoutNotFound`, `ImageRecognitionFailed`, …) with a single `DomainError → JSONResponse` handler registered on the FastAPI app | **Separation of transport from domain semantics**; **Single Responsibility Principle** | [backend/app/errors.py](backend/app/errors.py), handler in [backend/app/main.py:30](backend/app/main.py#L30) |
| Extracted nutrition logic (previously a 220-line grab-bag inside `meals_service.py`) into its own `nutrition/` module | **SRP** — `meals_service` is smaller and easier to read | [backend/app/services/nutrition/](backend/app/services/nutrition/) |
| Unified error envelope `{error: {code, message}}` across all services; frontend `apiFetch` exposes `error.code` so UI code can branch on domain codes | **Contract-first design** | [frontend/src/lib/api.ts](frontend/src/lib/api.ts) |

**Talking point:** *"Routes no longer know about HTTP status codes for domain failures — the handler owns that mapping. Testing a service outside of HTTP is now trivial."*

---

## 5. Security *(wave deferred — see plan file)*

Deferred by user for a later session. Planned items remain:
- Untrack and rotate the committed service-account JSON; write `firestore.rules`; add `max_length` to Pydantic schemas; introduce `slowapi` rate-limiting.

The **updated [.gitignore](.gitignore)** (wave 1 partial) already blocks future re-commits of `.env`, `*-adminsdk-*.json`, and build artefacts.

---

## 6. Reliability

| What we did | Pattern / principle | File |
|---|---|---|
| Split `/health` (liveness, no I/O) and `/ready` (probes Firestore) — ready returns 503 on downstream failure | **Liveness vs. Readiness distinction** (k8s idiom) | [backend/app/routes/health.py](backend/app/routes/health.py) |
| Idempotent-only retry (`GET`/`HEAD`/`OPTIONS`) with linear back-off in the gateway proxy *(lives on the **`comparison`** branch — gateway is microservices-only)* | **Retry Pattern**, scoped to safe verbs to avoid double-writes | `backend/microservices/gateway/proxy.py` on `comparison` |
| Per-upstream-host circuit breaker (CLOSED → OPEN → HALF_OPEN) that fails fast with 503 when an upstream is unhealthy *(lives on the **`comparison`** branch)* | **Circuit Breaker Pattern** (Fowler); bulkhead-style isolation per key | `backend/microservices/gateway/circuit_breaker.py` on `comparison` |
| Domain errors now have stable `code` identifiers (`meal_not_found`, `image_recognition_failed`, …) surfaced in the response envelope | Structured errors instead of free-text parsing | [backend/app/errors.py](backend/app/errors.py) |

**Talking point:** *"A flaky analytics service used to cascade into gateway timeouts across the board. The breaker gives each upstream its own health state — one sick service is a localized degradation, not a global outage."*

---

## 7. Testability

| What we did | Pattern / principle | File |
|---|---|---|
| New tests for the Strategy chain, including an **OCP compliance test** that plugs in a brand-new provider | Tests-as-design-spec | [backend/tests/test_nutrition_resolver.py](backend/tests/test_nutrition_resolver.py) |
| Unit tests for the Circuit Breaker covering all three state transitions and per-key isolation | Behavioural tests | [backend/tests/test_circuit_breaker.py](backend/tests/test_circuit_breaker.py) |
| Existing service tests migrated to assert on domain exception subclasses (`MealNotFound`, `WorkoutNotFound`) | Tests document the domain vocabulary, not the transport | [backend/tests/test_meals_service.py](backend/tests/test_meals_service.py), [backend/tests/test_workouts_service.py](backend/tests/test_workouts_service.py) |

**Planned (deferred with wave 1):** `pytest-cov` threshold + GitHub Actions CI.

---

## 8. Observability *(new)*

| What we did | Pattern / principle | File |
|---|---|---|
| **Correlation-ID propagation**: the request-logging middleware mints a UUID `x-request-id` (or accepts an upstream one), stamps every log line with it, and echoes it back on the response | **Correlation-ID Pattern** | [backend/app/main.py:55](backend/app/main.py#L55) on `layered`; gateway-to-service propagation on the **`comparison`** branch |
| `/metrics` endpoint on every service, emitting Prometheus text format (requests total + latency histogram) — zero third-party deps | In-process **Observer-style** middleware that records every response | [backend/app/observability/metrics.py](backend/app/observability/metrics.py) |
| Structured JSON logs with `request_id`, `method`, `path`, `duration_ms`, `client_ip` — pre-existing, now consistent with correlation ID | **Structured logging** | [backend/app/config/logging.py](backend/app/config/logging.py) |

**Talking point:** *"The three pillars — logs, metrics, traces — are all keyed off the same request ID. A single `grep` across gateway + meals logs reconstructs the full hop."*

---

## Sequence of demonstration (suggested for the viva / presentation)

1. Open [backend/app/services/nutrition/providers.py](backend/app/services/nutrition/providers.py) → show the Strategy chain.
2. Run `pytest backend/tests/test_nutrition_resolver.py -v` → point at the `test_open_closed_extension_via_new_provider` test.
3. Diff [backend/app/services/meals_service.py](backend/app/services/meals_service.py) across the N+1 fix commit → show the removed inner loop.
4. `curl localhost:8001/metrics` after hitting the API a few times → show counters and latency histogram.
5. Kill the meals service, hit the gateway 6× → show the breaker open and respond with 503.
6. `grep x-request-id` across gateway and service logs → show the correlation join.

---

## Known trade-offs (call these out proactively — graders love self-awareness)

- The **in-memory cache** is per-process; horizontal scaling will need the Redis backend (already wired, opt-in via `REDIS_URL`).
- The **denormalized meal items** double-write (main doc + sub-collection). Acceptable now; a migration could drop the sub-collection once all reads are embedded-only.
- The **circuit breaker is in-process**; multiple gateway replicas have independent state. A Redis-backed counter would unify this; left as future work.
- The **Strategy chain** for nutrition is priority-ordered, not scored. A real nutrition API would return confidence values and pick the highest; the current chain is a deliberately simple teaching version.

---

## Wave 1 (2026-04-25) — Security hardening + bundle measurement

- Secrets hygiene — **Least Privilege**: tracked service-account JSON `1 → 0` in HEAD (rotate the key since it was previously committed). `.gitignore:5`
- Input validation — **Fail Fast / Defensive Programming**: schema-bound coverage ~`87 % → hardened` (length + regex + numeric bounds across `app/schemas/`). `backend/app/schemas/workouts.py:16`
- Rate limiting — **Token Bucket**: `No → Yes` (`POST /auth` 10/min, `POST /api/v1/meals/analyze-image` 5/min). `backend/app/main.py:50`
- Firestore rules — **Authorization (owner check)**: `No → Yes` (`request.auth.uid == resource.data.uid`). `firestore.rules:1`
- CI gates — **Automation**: `Manual → PR-enforced` (pytest with ≥60% coverage gate + tsc + vitest). `.github/workflows/ci.yml:1`
- Bundle size — **Code Splitting**: `__ → 137.14 KB gzip` initial JS (`dist/assets/index-*.js`). `frontend/src/App.tsx:10`
- Testability — **SRP / Correctness**: `64/65 → 65/65` tests by fixing unreachable return so activity history is appended. `backend/app/services/workouts_service.py:23`
