# NFR Quantification — HealthSync

**Purpose.** Per-NFR plan for *what to measure*, *how to measure it*, and the *number itself once captured*. This is the working document for the report's quantitative sections (Task 1 justifications and Task 4 comparison).

**Companion docs:**
- [docs/nfr-narrative.md](nfr-narrative.md) — the slide-ready *narrative* (what was built, which pattern).
- [docs/current.md](current.md) — current implementation + test status.

**Branch state.** `layered` is the working branch. It contains the **layered monolith** at `app/main.py` (entry: `uvicorn app.main:app`). The **microservices distribution** (gateway + per-domain services) lives on a separate branch — not yet present in `layered`'s tree. The architecture comparison in Task 4 needs both runnable; flag the user when ready and we will either merge or use `git worktree`.

---

## 0. How we run measurements (branch strategy)

**Single-branch path (this branch, today):** every static and theory-based NFR can be captured from `layered` alone — Maintainability, Testability, Extensibility, Security audit, Observability existence proofs, and Performance §2a (N+1 from source diff). Load-tests against the monolith also run here.

**Two-branch path (when you want the comparison):** add the microservices branch as a parallel worktree so both run side-by-side without checkout dancing:

```bash
git worktree add ../healthsync-microservices <microservices-branch-name>
```

Then:
- `~/SE/SE-Project-3/`            ← `layered` (monolith) → `uvicorn app.main:app`
- `~/SE/healthsync-comparison/`   ← `comparison` branch (gateway + per-domain microservices) → `python run_microservices.py`

Both share the same Firestore project. The Reliability and side-by-side-RPS measurements (§1, §6) live in this two-branch path.

---

## 1. Scalability

**Architectural significance.** Drove the cache-aside layer ([app/config/cache.py](../backend/app/config/cache.py)) and the stateless-service convention (per-request DB client via `Depends`). Read-heavy endpoints (dashboard, analytics) were the bottleneck candidate.

**Tactic on file.** Cache-Aside (Performance/Scalability), Shared-Nothing (statelessness), Predicate Push-Down (Firestore `where` instead of stream-and-filter).

**Metric.** Sustained requests-per-second at p95 latency ≤ 300 ms on `GET /api/v1/dashboard?date=…`, plus cache hit ratio over a 60-second window.

**How to measure.**
```bash
# Warm the cache once
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/v1/dashboard?date=2026-04-25

# Sustained load (install: brew install hey)
hey -z 60s -c 50 -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/dashboard?date=2026-04-25
```
Report `Requests/sec` from `hey` summary, plus the p95 latency line. *Cache hit ratio* requires a small counter in `cache.py` (TODO; left for the load-test session).

**Status.** ⏳ Not yet measured — needs running system.

**Number to fill in:**
- Layered monolith: `__ RPS, p95 = __ ms`
- Microservices: `__ RPS, p95 = __ ms`  *(needs both)*
- Cache hit ratio over 60 s: `__ %`

---

## 2. Performance

Three sub-claims, three different ways to quantify:

### 2a. N+1 query elimination on `GET /api/v1/meals`

**Theory-first** (recommended): the number is provable from the source diff, no run needed.

- *Before* (legacy code path): listing N meals issued **N + 1 Firestore reads** — 1 collection scan, then 1 sub-collection read per meal for `items`.
- *After* (current code, [app/services/meals_service.py:82-116](../backend/app/services/meals_service.py#L82)): items are denormalized into the meal document at write time. Listing N meals issues **1 Firestore read** for the collection scan; 0 follow-ups (legacy rows fall through to a backward-compat path on read).
- At the paginated cap of `pageSize=100`: **101 reads → 1 read = 100× fewer**.

**Status.** ✅ Provable from code; no run required.
**Number:** `Reads(N) = N + 1 → 1`. At N=100: `101 → 1`.

### 2b. ONNX inference offloaded to thread-pool

**Metric.** Tail latency on `POST /api/v1/meals/analyze-image` under concurrent load.

**How to measure.**
```bash
# 10 concurrent uploads of a sample image
hey -n 30 -c 10 -m POST -T multipart/form-data \
  -D ./test-image.jpg \
  -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/v1/meals/analyze-image
```
Compare against a one-line revert (replace `await asyncio.to_thread(recognizer.predict, …)` with `recognizer.predict(…)` directly) to demonstrate the event-loop blocking.

**Status.** ⏳ Not yet measured — needs running system + sample image.
**Numbers:**
- Async (current): p95 = `__ ms`
- Sync revert: p95 = `__ ms`

### 2c. Frontend route-level code splitting

**Metric.** Initial-bundle size (JS shipped before any user interaction).

**How to measure.**
```bash
cd frontend
npm run build
# Inspect dist/assets/index-*.js and the per-route chunks
ls -la dist/assets/*.js | sort -k5 -n
```

Compare against a one-line revert: change `const Dashboard = lazy(() => import("./pages/Dashboard"));` back to `import Dashboard from "./pages/Dashboard";` (and remove the `<Suspense>` boundary).

**Status.** ✅ Captured.
**Numbers:**
- With `React.lazy`: initial bundle = **137.14 KB gzip** (`dist/assets/index-*.js`, `npm run build` on 2026-04-25)
- Without: initial bundle = `__ KB gzip`

---

## 3. Extensibility (OCP)

**Architectural significance.** Drove the Strategy + Chain-of-Responsibility refactor of the nutrition lookup ([app/services/nutrition/providers.py](../backend/app/services/nutrition/providers.py)). The previous design hard-coded the provider order inside `meals_service` — adding a new source meant editing that file. After the refactor, adding a new source means adding a new class.

**Metric.** *Cost to extend* = files modified + files added when introducing a new provider.

**Evidence (theory-only).** [tests/test_nutrition_resolver.py](../backend/tests/test_nutrition_resolver.py) contains an OCP-compliance test where a brand-new `SushiProvider` class is registered without editing any of `IndianNutritionProvider`, `GlobalCommonFoodsProvider`, `DefaultEstimateProvider`, or `NutritionResolver`. The diff for that extension is **+1 class definition, 0 edits in existing files**.

**Status.** ✅ Provable from code.
**Number:** `Extension cost = +1 file (or class), 0 edits`. The OCP test runs green, locking the contract.

---

## 4. Maintainability

**Architectural significance.** Drove the domain-error hierarchy ([app/errors.py](../backend/app/errors.py)) and the nutrition-module split. Both keep individual files small and let a service be tested without HTTP machinery.

**Metric.** Average cyclomatic complexity per file in `backend/app`, max LOC per file, max complexity rank (A-F).

**How to measure.**
```bash
pip install radon
radon cc backend/app -a --total-average
radon raw backend/app -s
```

Report the `Average complexity` line from `cc`, plus the top-5 files by `LOC` from `raw`.

**Status.** ✅ Captured — see snapshot section below.
**Numbers:**
- Average cyclomatic complexity: **A (2.98)** across 246 blocks.
- Max complexity rank: **D (27)** — single outlier, `_compute_daily_progress` in `analytics_service.py`.
- Total SLOC: 2,393 across 52 files; biggest file `recommendation_engine.py` at 500 SLOC.

---

## 5. Security

**Architectural significance.** Mostly *deferred* (Wave 1). What's already shipped: Firebase JWT bearer auth, CORS allow-list, Pydantic type validation, and a hardened `.gitignore` that blocks `.env` and `*-adminsdk-*.json` from future commits.

**Metric (audit, not measurement).** Three counters:
1. Number of secrets currently tracked in git history (target: 0).
2. Pydantic input fields with explicit bounds (`max_length`, `regex`, range constraints) ÷ total input fields.
3. Presence of rate-limit on auth + image-analysis endpoints (boolean).

**How to capture.**
```bash
# (1) — install gitleaks: brew install gitleaks
gitleaks detect --no-banner

# (2) — count fields with/without bounds
rg -n "Field\(.*max_length" backend/app/schemas/ | wc -l
rg -n "Field\(\.\.\." backend/app/schemas/ | wc -l

# (3) — boolean inspection
rg -n "slowapi|RateLimiter|@limiter" backend/ || echo "no rate limiting found"
```

**Status.** ✅ Remediated (Wave 1).
**Numbers:**
- Secrets tracked in HEAD: **0** (the service-account JSON is untracked + ignored); **rotate the key** because it was previously committed to git history.
- Bounded-field ratio: ✅ **Hardened** (string length + regex patterns, numeric ranges, and bounded list sizes across `app/schemas/`).
- Rate-limit present: ✅ **Yes** (`slowapi` middleware; limits on `POST /auth` and `POST /api/v1/meals/analyze-image`).

---

## 6. Reliability

**Architectural significance.** Drove three artefacts: a gateway circuit breaker and retry-with-back-off on idempotent verbs (both on the **`comparison`** branch — `backend/microservices/gateway/{circuit_breaker.py, proxy.py}` — since they only make sense once the system is split into independently-failing services), and the liveness/readiness split in [app/routes/health.py](../backend/app/routes/health.py) on this branch.

**Tactic on file.** Circuit Breaker (Fowler), Retry, Liveness/Readiness probe.

**Metric.** Gateway 5xx error rate while one upstream is down — **breaker on vs. off**. Plus time-to-detect (consecutive failures × per-call timeout) and time-to-recover (the breaker's `reset_timeout`).

**How to measure (needs the `comparison` worktree).**
```bash
# Terminal A — start microservices stack from the comparison branch
cd ~/SE/healthsync-comparison/backend
python run_microservices.py

# Terminal B — kill one upstream mid-run
docker compose stop meals    # or: pkill -f "uvicorn microservices.meals"

# Terminal C — hammer the gateway, 30 requests
for i in {1..30}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
    -H "Authorization: Bearer $TOKEN" \
    http://127.0.0.1:8000/api/v1/meals?dateFrom=2026-04-01
done | sort | uniq -c
```

Repeat with the breaker disabled (one-line comment-out of `_BREAKER.allow(...)` in `proxy.py`).

**Status.** ⏳ Not yet measured. *(needs both worktrees)*
**Numbers:**
- Breaker on:  5xx rate = `__ %`, mean response time during outage = `__ ms`
- Breaker off: 5xx rate = `__ %`, mean response time during outage = `__ ms`
- Time-to-detect: `failure_threshold × per-call timeout = 5 × 30s = 150s` worst case (currently configured).
- Time-to-recover: `reset_timeout = 15s` (configured in `backend/microservices/gateway/circuit_breaker.py` on the **`comparison`** branch).

---

## 7. Testability

**Architectural significance.** The repository pattern + DI-via-`Depends` make services trivially mockable — every test in `backend/tests/` mocks the Firestore client without touching real infrastructure.

**Metric.** Backend line coverage %, total test count, suite runtime.

**How to measure.**
```bash
pip install pytest-cov
cd backend
python -m pytest --cov=app --cov-report=term-missing
```

**Status.** ◑ Backend captured; frontend coverage pending.
**Numbers:**
- Backend coverage: **76 %** (1,809 statements, 430 missed).
- Test count: **56 tests across 16 files**, **56/56 passing**. *(Down from 65 after deleting three orphan test files that exercised the now-removed microservices scaffold; coverage of the layered codebase rose from 73 % → 76 %.)*
- Suite runtime: **~1.0 s** (mocked Firestore).
- Frontend coverage (`vitest run --coverage`): TBD — capture when coverage collection is enabled for the frontend test run.

---

## 8. Observability

**Architectural significance.** Drove the correlation-ID middleware (in `_base.py` on `main`; replicated in `app/main.py` on `layered`) and the in-tree Prometheus exporter ([app/observability/metrics.py](../backend/app/observability/metrics.py)).

**Tactic on file.** Correlation-ID Pattern, Structured Logging, In-process metrics middleware.

**Metric (existence + fan-out, not throughput).**
1. Number of distinct metrics exposed at `/metrics`.
2. Percentage of HTTP requests whose log lines carry a `request_id` field (target: 100%).
3. Number of structured log fields per request line.

**How to capture.**
```bash
# (1) — count Prometheus metric families
curl -s http://127.0.0.1:8001/metrics | grep -c "^# HELP"

# (2) — sample 100 requests, count log lines with request_id
for i in {1..100}; do curl -s http://127.0.0.1:8001/health > /dev/null; done
grep -c request_id /path/to/logfile  # then divide by 100

# (3) — inspect one log line
tail -1 /path/to/logfile | python -m json.tool
```

**Status.** ✅ Wired. `register_metrics_middleware(app)` + `register_metrics_endpoint(app)` now live in [app/main.py](../backend/app/main.py) (last two lines). Correlation-ID + structured logging were already wired.
**Numbers:**
- Routes registered on the monolith: **28** (verified via `python -c "from app.main import app; print(len(app.routes))"`). `/health`, `/ready`, `/metrics` all present.
- Metric families exposed at `/metrics`: **2** (`http_requests_total` counter, `http_request_duration_seconds` histogram with 11 buckets: 5 ms → 10 s).
- Request-ID coverage: **100 %** by construction (every request mints or accepts an ID).
- Log fields per request: **6** (`request_id`, `method`, `path`, `status_code`, `duration_ms`, `client_ip`) — see [app/main.py:31-64](../backend/app/main.py#L31).

---

## Quick reference — what feeds which task

| NFR | Task 1 (justification) | Task 3 (tactic) | Task 4 (quantified compare) |
|---|---|---|---|
| Scalability | Architecturally significant — cache layer | Cache-Aside | ✅ candidate |
| Performance | Significant within structure | Denormalization, async I/O | ✅ candidate (latency) |
| Extensibility | Architecturally significant — Strategy | Intermediary / Strategy | theory only |
| Maintainability | Significant within structure | High Cohesion (SRP refactors) | static numbers only |
| Security | Significant within structure | Limit Access (JWT, CORS) | audit only |
| Reliability | Architecturally significant — Breaker + Retry | Circuit Breaker, Retry | ✅ candidate (error rate) |
| Testability | Significant within structure | Internal Monitor | static numbers only |
| Observability | Architecturally significant — Correlation-ID | Correlation-ID, Metrics | static numbers only |

**Two NFRs to *quantify in Task 4* (the assignment minimum):** Performance (latency) and Reliability (error rate under failure). They give the strongest before-vs-after numbers and require the microservices worktree only for the second.

---

## Captured numbers — snapshot 2026-04-25

Captured from this `layered` branch, `git rev-parse HEAD` at time of snapshot. All static-analysis numbers; load-test numbers still pending.

### Maintainability — `radon` on `backend/app`

- **Average cyclomatic complexity: A (2.98)** across 246 blocks (classes/functions/methods).
- **Total SLOC across `backend/app`: 2,393 across 52 files.**
- **Top 10 files by SLOC**:
  | SLOC | File |
  |---:|---|
  | 500 | [services/recommendation_engine.py](../backend/app/services/recommendation_engine.py) |
  | 175 | [services/analytics_service.py](../backend/app/services/analytics_service.py) |
  | 124 | [services/meals_service.py](../backend/app/services/meals_service.py) |
  | 114 | [services/recommendations_service.py](../backend/app/services/recommendations_service.py) |
  |  84 | [observability/metrics.py](../backend/app/observability/metrics.py) |
  |  79 | [schemas/workouts.py](../backend/app/schemas/workouts.py) |
  |  73 | [schemas/plans.py](../backend/app/schemas/plans.py) |
  |  72 | [routes/workouts.py](../backend/app/routes/workouts.py) |
  |  69 | [services/nutrition/providers.py](../backend/app/services/nutrition/providers.py) |
  |  68 | [config/cache.py](../backend/app/config/cache.py) |
- **Single complexity outlier:** `_compute_daily_progress` in `analytics_service.py` ranks **D (27)** — flag as a refactor candidate before the report (one big aggregation function; could be split into per-metric helpers and pull SRP closer).

**Talking point.** *"Average complexity is A across the entire backend; one outlier function (D) is identified and isolated, not endemic. The codebase is read-tractable."*

### Testability — `pytest --cov`

- **Total tests collected:** 56 across 16 test files. *(Down from 65 — three orphan test files that targeted the deleted microservices scaffold were removed; remaining tests all live on the layered monolith.)*
- **Suite runtime:** ~1.0 s (mocked; no real Firestore).
- **Backend line coverage:** **76 %** (1,809 statements, 430 missed). *(Up from 73 % — the deleted test files were testing microservices code outside `app/`, so removing them shrunk the test count without shrinking the covered set.)*
- **Currently failing:** 0 — **56/56 passing**.
- **Worst-covered modules** (the gaps to close before the report):
  | Coverage | File |
  |---:|---|
  | 0 %  | observability/metrics.py *(not wired into `app/main.py` on this branch — see Observability finding below)* |
  | 26 % | services/image_recognition.py *(skipped — needs ONNX runtime)* |
  | 32 % | services/plans_service.py |
  | 35 % | services/goals_service.py |
  | 47 % | services/recommendations_service.py |

**Talking point.** *"73 % line coverage with a sub-second suite runtime — fast enough to run on every save, fast enough that CI feedback is immediate."*

### Extensibility — OCP cost

- **Cost to add a new nutrition source:** +1 file (one new `XxxProvider` class), 0 edits in existing classes.
- **Evidence:** `tests/test_nutrition_resolver.py::test_open_closed_extension_via_new_provider` plugs in a brand-new `SushiProvider` and resolves through it without touching `IndianNutritionProvider`, `GlobalCommonFoodsProvider`, `DefaultEstimateProvider`, or `NutritionResolver`. The test is in the green set above (passes today).

**Talking point.** *"OCP isn't an aspiration — there's a test that fails the moment we accidentally close the system."*

### Security audit (snapshot)

- **Rate-limiting present:** ✅ **Yes.** `slowapi` middleware wired in `app/main.py`, with per-route limits on `POST /auth` and `POST /api/v1/meals/analyze-image`.
- **Pydantic field bounds:** ✅ **Hardened.** All request-facing schemas in `app/schemas/` now have explicit string length + regex patterns, bounded numeric ranges, and bounded list sizes (plus list-item validators where applicable).
- **Service-account JSON tracked in git history:** ⚠️ Yes — the file is now untracked on `layered`, but you still must rotate the Firebase service-account key because it was committed previously.

**Talking point.** *"Pydantic enforces shape and range on most inputs (~87 % of fields have bounds). The two real gaps — rate-limiting and the committed key — are scoped into Wave 1, not architectural problems."*

### Observability (existence proof)

- **Metric families exposed at `/metrics`:** **2** — `http_requests_total` (counter) and `http_request_duration_seconds` (histogram with 11 buckets: 5 ms → 10 s).
- **Log fields per request line:** **6** (`request_id`, `method`, `path`, `status_code`, `duration_ms`, `client_ip`) — see `app/main.py:31-64`.
- **Correlation-ID coverage:** every request gets one (mints UUID4 hex if upstream didn't send `x-request-id`). 100 % by construction.
- ✅ **Wiring confirmed:** `register_metrics_middleware(app)` + `register_metrics_endpoint(app)` are mounted at the bottom of [app/main.py](../backend/app/main.py) so every request observed by the FastAPI app feeds the counter + histogram. The same module is reused per-service on the **`comparison`** branch.

**Talking point.** *"Three pillars share one key. The same `request_id` shows up in the log line, in the trace context, and in the response header — a single grep reconstructs the full hop."*

---

## Outstanding measurements (load-test session)

These need a running system (and for §6, the `main` worktree). Not blocking the report skeleton; capture in one focused session and fill the values back into the §1–§8 entries above.

| Source | What to run | Output |
|---|---|---|
| §1 Scalability | `hey -z 60s -c 50 …/dashboard?date=…` on layered, then on microservices | RPS, p95 |
| §2a Performance (N+1) | already proven from code; no run needed | — |
| §2b Performance (ONNX) | `hey -n 30 -c 10 -m POST` on `/analyze-image` with vs. without `to_thread` | p95 |
| §2c Performance (bundle) | `cd frontend && npm run build` with vs. without `React.lazy` | bundle KB gzip |
| §6 Reliability | kill an upstream, hammer gateway, breaker on vs. off | 5xx rate, recovery time |

---

## Frontend bundle size

✅ Captured on 2026-04-25 (`npm run build`):
- Initial JS bundle (`dist/assets/index-*.js`): **137.14 KB gzip**
