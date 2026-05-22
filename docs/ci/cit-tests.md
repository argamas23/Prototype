# CIT tests (GitHub Actions)

Workflow: `.github/workflows/cit-tests.yml`

## What it produces

Each run uploads 2 artifacts:

- `backend-test-artifacts`
  - `pytest.log` (full console log)
  - `pytest-junit.xml` (JUnit XML)
  - `pytest-report.json` (machine-readable pytest results)
  - `coverage.xml` (Cobertura-style coverage XML from `pytest-cov`)

- `frontend-test-artifacts`
  - `vitest.log` (full console log)
  - `vitest-junit.xml` (JUnit XML)
  - `vitest-report.json` (machine-readable vitest results)
  - `coverage/` (coverage reports: `json`, `lcov`, `cobertura`, plus text summary in logs)

## Local equivalents

Test locations:

- Backend: `backend/tests/cit/`
- Frontend: `frontend/src/tests/cit/`

One-command local run (creates `artifacts/` automatically):

```bash
./scripts/run_cit_local.sh
```

Backend-only (creates `artifacts/backend` automatically):

```bash
./backend/scripts/run_cit_local.sh
```

Frontend-only (creates `artifacts/frontend` automatically):

```bash
cd frontend
npm run test:cit
```

Notes:

- Backend “full telemetry” (JUnit/XML, JSON report, coverage XML) requires `pytest-cov` + `pytest-json-report` (now included in `backend/requirements.txt`).
- Local scripts attempt to auto-install them (set `CIT_AUTO_INSTALL_PYTEST_REPORTERS=0` to disable).
- Frontend coverage requires `@vitest/coverage-v8` (scripts attempt a `--no-save` install by default; set `CIT_AUTO_INSTALL_VITEST_COVERAGE_V8=0` to disable).
- Logs are retained per run under `artifacts/**/runs/<run_id>/` and the most recent outputs are copied to `artifacts/**/latest/`.

Backend:

```bash
python -m pip install -r backend/requirements.txt pytest-cov pytest-json-report
mkdir -p artifacts/backend
cd backend
python -m pytest -q \
  tests/cit \
  --junitxml=../artifacts/backend/pytest-junit.xml \
  --json-report --json-report-file=../artifacts/backend/pytest-report.json \
  --cov=app --cov-report=xml:../artifacts/backend/coverage.xml --cov-report=term-missing \
  --durations=0
```

Frontend:

```bash
cd frontend
npm ci
npm install --no-save @vitest/coverage-v8
mkdir -p ../artifacts/frontend
npx vitest run \
  src/tests/cit \
  --coverage --coverage.provider=v8 \
  --coverage.reportsDirectory=../artifacts/frontend/coverage \
  --coverage.reporter=text --coverage.reporter=json --coverage.reporter=lcov --coverage.reporter=cobertura \
  --reporter=default --reporter=junit --reporter=json \
  --outputFile.junit=../artifacts/frontend/vitest-junit.xml \
  --outputFile.json=../artifacts/frontend/vitest-report.json
```
