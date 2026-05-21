# Current Status — HealthSync

**Last updated:** 2026-04-25
**Purpose:** Snapshot of where the codebase and the NFR story stand today, so the next session (or a teammate reading cold) can pick up without re-reading the whole plan.

Complementary docs:
- [docs/nfr-narrative.md](nfr-narrative.md) — slide-ready per-NFR pattern mapping (keep that as the presentation source).
- [docs/project-gap-analysis.md](project-gap-analysis.md) — earlier gap audit that seeded the plan.
- `~/.claude/plans/in-this-repository-i-floating-shamir.md` — the 4-wave roadmap.

---

## 1. Test status

Ran against Python 3.14 in `venv/`. After the fixes in this session:

| File | Status | Notes |
|---|---|---|
| `tests/test_meals_service.py` | **passing (4/4)** | Re-asserted `MealItemsEmpty → 422` (new contract) and updated the `log_meal` mock to include embedded `items` (reflects the N+1 denormalization). |
| `tests/test_dashboard_service.py` | **passing (4/4)** | Added an autouse `_reset_process_cache` fixture in `tests/conftest.py` that clears `get_cache`'s `lru_cache` between tests. Without it, the first test's zeroed summary was cached and subsequent tests hit stale entries. |
| `tests/test_gateway_proxy.py` | **passing (3/3)** | Fixed `httpx.StreamConsumed`: `_send_with_retry` reads the full body (required so retries don't replay POSTs), so we now stream `response.content` back once instead of calling `aiter_raw()` on an already-consumed response. |
| `tests/test_gateway_routing.py` | **passing (3/3)** | Same fix as above — routing tests exercised the same streaming path. |
| `tests/test_workouts_service.py` | **passing (5/5)** | Fixed unreachable early-return in `log_workout` so `append_activity_history_entry` is executed (green suite: 65/65). |
| Other service/route tests | unchanged | Not touched in this session. |

**If you want to verify locally:**
```bash
source venv/bin/activate
cd backend && python -m pytest
```

---

## 2. NFR status

8 NFRs, one line per row: what's in the code today, what's still missing, and which assignment task it feeds.

| # | NFR | Status | Key artefact | What's still missing (report + code) |
|---|---|---|---|---|
| 1 | **Scalability** | ✅ Implemented | `backend/app/config/cache.py`, `firestore.indexes.json`, stateless services | Run the numbers on concurrent-request throughput for Task 4's quantification. |
| 2 | **Performance** | ✅ Implemented | N+1 fix in `meals_service.py`, `asyncio.to_thread` for ONNX, `React.lazy` in `App.tsx` | Measure p95 latency on `/api/v1/meals?pageSize=100` before/after (Task 4 quant NFR #1). Bundle-size before/after for the frontend slide. |
| 3 | **Extensibility** | ✅ Implemented | `backend/app/services/nutrition/providers.py` (Strategy + Chain), `frontend/src/hooks/useApi.ts` | UML class diagram of the Strategy chain for Task 3 ("2 patterns with diagrams"). |
| 4 | **Maintainability** | ✅ Implemented | `backend/app/errors.py`, nutrition module split, unified error envelope | Cyclomatic-complexity / LOC-before-after numbers optional but grade-boosting. |
| 5 | **Security** | ✅ Implemented (Wave 1) | `slowapi` rate limits, hardened schemas, `firestore.rules`, CI workflow, secret untracked + ignored | Load-test numbers still pending; rotate the Firebase service-account key because it was previously committed. |
| 6 | **Reliability** | ✅ Implemented | `gateway/proxy.py` (retry), `gateway/circuit_breaker.py`, `app/routes/health.py` (liveness + readiness) | State-diagram of the breaker for Task 3. One integration test that flips the breaker would strengthen the evidence. |
| 7 | **Testability** | ✅ Improved | Fast suite, CI workflow (`pytest` + `ruff` + `tsc` + `vitest`) | Coverage threshold + integration/E2E tests still optional grade boosters. |
| 8 | **Observability** | ✅ Implemented | `backend/app/observability/metrics.py`, correlation-ID middleware in `_base.py`, structured JSON logs | A screenshot of `/metrics` output + a correlation-grepped log excerpt will be enough evidence for Task 1/3. |

**Architecturally significant** (drove structural decisions, belong in Task 1's "why architecturally significant" justification): Scalability, Extensibility, Reliability, Observability.
**Significant but acted within existing structure**: Performance, Security, Maintainability, Testability.

---

## 3. Code status by area

### Backend

| Area | State | Comment |
|---|---|---|
| Service layer (`app/services/*`) | stable | Workouts dead-code bug fixed; suite is green. |
| Repositories (`app/repositories/*`) | stable | Untouched this session. |
| Domain errors (`app/errors.py`) | stable | New hierarchy; covered by tests. |
| Cache layer (`app/config/cache.py`) | stable | `Cache` protocol + in-memory + Redis backends. |
| Nutrition strategies (`app/services/nutrition/`) | stable | Strategy + Chain; OCP compliance test passes. |
| Health routes (`app/routes/health.py`) | stable | Liveness / readiness split. |
| Observability (`app/observability/metrics.py`) | stable | Prometheus text-format `/metrics`. |
| Gateway (`microservices/gateway/*`) | stable post-fix | Proxy now streams buffered body (no StreamConsumed). Retry + breaker in place. |
| Tests (`tests/*`) | ✅ green | 65/65 passing. |

### Frontend

| Area | State | Comment |
|---|---|---|
| Routing (`src/App.tsx`) | stable | All pages now `React.lazy`; Suspense fallback in place. |
| HTTP layer (`src/lib/api.ts`) | stable | Parses `{error: {code, message}}` envelope; surfaces `err.code`. |
| Hooks (`src/hooks/useApi.ts`) | stable | `useApiQuery` + `useApiMutation`; not yet adopted by every page. |

### Repo-level

| Item | State |
|---|---|
| `firestore.indexes.json` | ✅ present (composite indexes for meals + workouts by date) |
| `.gitignore` | ✅ hardened (blocks `.env`, `*-adminsdk-*.json`, caches, build artefacts) |
| `backend/security/se-healthsync-firebase-adminsdk-*.json` | ⚠️ **still tracked in git** — must be rotated + untracked (Wave 1) |
| `.github/workflows/ci.yml` | ❌ not yet created (Wave 1) |
| `firestore.rules` | ❌ not yet written (Wave 1) |

---

## 4. Known issues & co-owned risks

1. **Teammate's microservices refactor is mid-flight.** Layered → microservices is already mostly done in the backend (services are per-domain), but the refactor is being iterated on. Dead-code bug in `workouts_service.py` is symptomatic.
   - **Mitigation:** draft ADR-001 ("Microservices + API Gateway") and ADR-002 ("Domain-error hierarchy over HTTPException") together *before* further code changes. That pins the contract.
2. **Firebase service-account JSON is committed.** Every day it stays in-repo is another day the key could leak via forks, clones, or CI logs.
   - **Mitigation:** schedule Wave 1 ASAP.
3. **In-memory cache is per-process.** Two gateway replicas = two independent caches and two independent breakers. Fine for the demo; `REDIS_URL` is wired if we need to unify.
4. **Gateway proxy now buffers the upstream response.** File upload endpoints (e.g. `/analyze-image`) will keep the whole image in memory during the hop. Acceptable at current traffic; note it in the trade-offs slide.

---

## 5. What the report needs (mapped to assignment tasks)

Concrete list of artefacts still to produce *outside* the code:

### Task 1 — Requirements & Subsystems
- [ ] Functional requirements list (can be lifted from `README.md` + route handlers).
- [ ] 8 NFR paragraphs using the table in §2 above — one paragraph each, with the "architecturally significant / significant within structure" split called out explicitly.
- [ ] Subsystem overview: Gateway, Meals, Workouts, Goals, Dashboard, Profile, Analytics, plus Frontend SPA and Firestore. One sentence per subsystem.

### Task 2 — Architecture Framework (IEEE 42010 + ADRs)
- [ ] Stakeholder table: end-user, dev team, ops/grader, data source (Firebase). Each with their concerns (mapped to the NFRs above) and the view(point) that addresses them (Logical view, Deployment view, Process view, Development view).
- [ ] **4 ADRs in Nygard template**:
  1. Adopt microservices + API gateway *(Scalability, Deployability vs. operational complexity)*
  2. Cache-Aside for dashboard/analytics reads *(Performance vs. read-after-write consistency)*
  3. Strategy + Chain-of-Responsibility for nutrition providers *(Extensibility/OCP vs. indirection)*
  4. Circuit Breaker + Retry in the gateway *(Reliability vs. half-open latency)*
  - Optional 5th: Domain-error hierarchy over `HTTPException` *(Maintainability vs. boilerplate)*

### Task 3 — Tactics & Patterns
- [ ] **5 tactics** (Bass/Bosch naming): Cache-Aside, Circuit Breaker, Retry-with-backoff, Intermediary/Strategy, Correlation-ID + Metrics.
- [ ] **2 patterns with diagrams**:
  - Strategy (nutrition resolver) — UML class diagram.
  - Circuit Breaker (gateway) — state diagram (CLOSED / OPEN / HALF_OPEN + transitions).

### Task 4 — Prototype & Analysis
- [ ] One end-to-end flow to demo: *image upload → meal recognized → meal logged → dashboard updates*. Everything needed is already in code.
- [ ] Architecture comparison: microservices vs. monolith.
- [ ] **Quantify 2 NFRs**:
  - Performance: p95 latency + Firestore read count on `/api/v1/meals?pageSize=100` before vs. after the N+1 fix.
  - Reliability: gateway error rate with one upstream killed, breaker on vs. off. (Simple way: `docker compose stop meals`, then `curl` the gateway 20 times with breaker enabled vs. disabled.)
- [ ] Trade-off write-up: inter-service hop adds ~1–5 ms, buys failure isolation + independent scaling.

---

## 6. Recommended next moves

In priority order, smallest viable steps:

1. **Draft ADRs 1 and 2** (microservices + domain errors) with the teammate. 30-minute conversation. Locks the contract before more refactor churn.
2. **Gather the Task 4 numbers**: seed 500 meals for a test user, run the 50 RPS load test on `/api/v1/meals?pageSize=100` + `/api/v1/dashboard`, record p50/p95/p99 + error rate.
5. **Draw the two diagrams** (Strategy class, Breaker state) — 10 minutes each in Mermaid or draw.io. These go straight into the report.

---

*End of status snapshot.*
