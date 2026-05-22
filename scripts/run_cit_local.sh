#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="${ROOT_DIR}/artifacts"
RUN_ID="${CIT_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo unknown)-$$}"

BACKEND_RUN_DIR="${ART_DIR}/backend/runs/${RUN_ID}"
FRONTEND_RUN_DIR="${ART_DIR}/frontend/runs/${RUN_ID}"
mkdir -p "${BACKEND_RUN_DIR}" "${FRONTEND_RUN_DIR}"
mkdir -p "${ART_DIR}/backend/latest" "${ART_DIR}/frontend/latest"

echo "==> Backend CIT → ${BACKEND_RUN_DIR}"
pushd "${ROOT_DIR}/backend" >/dev/null
python -c "import pytest_cov, pytest_jsonreport" >/dev/null 2>&1 && HAVE_PYTEST_REPORTERS=1 || HAVE_PYTEST_REPORTERS=0
if [[ "${HAVE_PYTEST_REPORTERS}" -eq 0 && "${CIT_AUTO_INSTALL_PYTEST_REPORTERS:-1}" -eq 1 ]]; then
  echo "==> Backend: installing pytest-cov + pytest-json-report to enable coverage/telemetry"
  python -m pip install -q pytest-cov pytest-json-report >"${BACKEND_RUN_DIR}/pip-install.log" 2>&1 || true
  python -c "import pytest_cov, pytest_jsonreport" >/dev/null 2>&1 && HAVE_PYTEST_REPORTERS=1 || HAVE_PYTEST_REPORTERS=0
fi

if [[ "${HAVE_PYTEST_REPORTERS}" -eq 1 ]]; then
  {
    echo "## CIT backend test log"
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "python=$(python -V 2>&1)"
    echo "run_id=${RUN_ID}"
    echo
  } >"${BACKEND_RUN_DIR}/pytest.log"
  python -m pytest -vv -rA tests/cit \
    --capture=tee-sys \
    --showlocals --tb=long \
    -o log_cli=true -o log_cli_level=INFO \
    --junitxml="${BACKEND_RUN_DIR}/pytest-junit.xml" \
    --json-report --json-report-file="${BACKEND_RUN_DIR}/pytest-report.json" \
    --cov=app --cov-report="xml:${BACKEND_RUN_DIR}/coverage.xml" --cov-report=term-missing \
    --durations=0 2>&1 | tee -a "${BACKEND_RUN_DIR}/pytest.log"
else
  {
    echo "## CIT backend test log"
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "python=$(python -V 2>&1)"
    echo "run_id=${RUN_ID}"
    echo
    echo "WARN: pytest-cov / pytest-json-report not available; coverage + JSON/JUnit telemetry disabled."
    [[ -f "${BACKEND_RUN_DIR}/pip-install.log" ]] && echo "      pip details: ${BACKEND_RUN_DIR}/pip-install.log"
    echo "      Fix: activate your venv and run: python -m pip install -r backend/requirements.txt"
    echo
  } >"${BACKEND_RUN_DIR}/pytest.log"
  python -m pytest -vv -rA tests/cit \
    --capture=tee-sys \
    --showlocals --tb=long \
    -o log_cli=true -o log_cli_level=INFO \
    --durations=0 2>&1 | tee -a "${BACKEND_RUN_DIR}/pytest.log"
fi
popd >/dev/null

cp -f "${BACKEND_RUN_DIR}/pytest.log" "${ART_DIR}/backend/latest/pytest.log" 2>/dev/null || true
[[ -f "${BACKEND_RUN_DIR}/pytest-junit.xml" ]] && cp -f "${BACKEND_RUN_DIR}/pytest-junit.xml" "${ART_DIR}/backend/latest/pytest-junit.xml" || true
[[ -f "${BACKEND_RUN_DIR}/pytest-report.json" ]] && cp -f "${BACKEND_RUN_DIR}/pytest-report.json" "${ART_DIR}/backend/latest/pytest-report.json" || true
[[ -f "${BACKEND_RUN_DIR}/coverage.xml" ]] && cp -f "${BACKEND_RUN_DIR}/coverage.xml" "${ART_DIR}/backend/latest/coverage.xml" || true

echo "==> Frontend CIT → ${FRONTEND_RUN_DIR}"
pushd "${ROOT_DIR}/frontend" >/dev/null
node -e "require.resolve('@vitest/coverage-v8')" >/dev/null 2>&1 && HAVE_V8_COV=1 || HAVE_V8_COV=0
if [[ "${HAVE_V8_COV}" -eq 0 && "${CIT_AUTO_INSTALL_VITEST_COVERAGE_V8:-1}" -eq 1 ]]; then
  echo "==> Frontend: installing @vitest/coverage-v8 (no-save) to enable coverage metrics"
  VITEST_VERSION="$(node -e "console.log(require('vitest/package.json').version)" 2>/dev/null || true)"
  if [[ -n "${VITEST_VERSION}" ]]; then
    npm install --no-save "@vitest/coverage-v8@${VITEST_VERSION}" >"${FRONTEND_RUN_DIR}/npm-install.log" 2>&1 || true
  else
    npm install --no-save @vitest/coverage-v8 >"${FRONTEND_RUN_DIR}/npm-install.log" 2>&1 || true
  fi
  node -e "require.resolve('@vitest/coverage-v8')" >/dev/null 2>&1 && HAVE_V8_COV=1 || HAVE_V8_COV=0
fi

if [[ "${HAVE_V8_COV}" -eq 1 ]]; then
  {
    echo "## CIT frontend test log"
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "node=$(node -v)"
    echo "npm=$(npm -v)"
    echo "run_id=${RUN_ID}"
    echo
  } >"${FRONTEND_RUN_DIR}/vitest.log"
  npx vitest run --reporter=verbose src/tests/cit \
    --coverage \
    --coverage.provider=v8 \
    --coverage.reportsDirectory="${FRONTEND_RUN_DIR}/coverage" \
    --coverage.reporter=text \
    --coverage.reporter=json \
    --coverage.reporter=lcov \
    --coverage.reporter=cobertura \
    --reporter=junit \
    --reporter=json \
    --outputFile.junit="${FRONTEND_RUN_DIR}/vitest-junit.xml" \
    --outputFile.json="${FRONTEND_RUN_DIR}/vitest-report.json" \
    --logHeapUsage --printConsoleTrace \
    2>&1 | tee -a "${FRONTEND_RUN_DIR}/vitest.log"
  if [[ -d "${FRONTEND_RUN_DIR}/coverage" ]]; then
    echo "" | tee -a "${FRONTEND_RUN_DIR}/vitest.log" >/dev/null
    echo "coverage_dir=${FRONTEND_RUN_DIR}/coverage" | tee -a "${FRONTEND_RUN_DIR}/vitest.log" >/dev/null
  fi
else
  {
    echo "## CIT frontend test log"
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "node=$(node -v)"
    echo "npm=$(npm -v)"
    echo "run_id=${RUN_ID}"
    echo
    echo "WARN: @vitest/coverage-v8 not available; coverage metrics disabled."
    [[ -f "${FRONTEND_RUN_DIR}/npm-install.log" ]] && echo "      npm details: ${FRONTEND_RUN_DIR}/npm-install.log"
    echo "      Fix: cd frontend && npm i -D @vitest/coverage-v8"
    echo
  } >"${FRONTEND_RUN_DIR}/vitest.log"
  npx vitest run --reporter=verbose src/tests/cit \
    --reporter=junit \
    --reporter=json \
    --outputFile.junit="${FRONTEND_RUN_DIR}/vitest-junit.xml" \
    --outputFile.json="${FRONTEND_RUN_DIR}/vitest-report.json" \
    --logHeapUsage --printConsoleTrace \
    2>&1 | tee -a "${FRONTEND_RUN_DIR}/vitest.log"
fi
popd >/dev/null

if [[ -f "${FRONTEND_RUN_DIR}/vitest-report.json" ]]; then
  node -e 'const fs=require("fs");const p=process.argv[1];const r=JSON.parse(fs.readFileSync(p,"utf8"));const totalMs=Math.max(0,(r.testResults||[]).reduce((m,t)=>Math.max(m,(t.endTime||0)-(t.startTime||0)),0));console.log("\\n== Vitest Telemetry Summary ==");console.log(`suites_total=${r.numTotalTestSuites} suites_passed=${r.numPassedTestSuites} suites_failed=${r.numFailedTestSuites}`);console.log(`tests_total=${r.numTotalTests} tests_passed=${r.numPassedTests} tests_failed=${r.numFailedTests} tests_pending=${r.numPendingTests}`);console.log(`run_startTime_ms=${r.startTime} success=${r.success}`);console.log("\\nPer-test durations (ms):");(r.testResults||[]).forEach(tr=>{(tr.assertionResults||[]).forEach(a=>{const name=a.fullName||a.title;const dur=a.duration??0;console.log(`${dur}\\t${name}`);});});' "${FRONTEND_RUN_DIR}/vitest-report.json" | tee -a "${FRONTEND_RUN_DIR}/vitest.log"
fi

cp -f "${FRONTEND_RUN_DIR}/vitest.log" "${ART_DIR}/frontend/latest/vitest.log" 2>/dev/null || true
cp -f "${FRONTEND_RUN_DIR}/vitest-junit.xml" "${ART_DIR}/frontend/latest/vitest-junit.xml" 2>/dev/null || true
cp -f "${FRONTEND_RUN_DIR}/vitest-report.json" "${ART_DIR}/frontend/latest/vitest-report.json" 2>/dev/null || true
[[ -d "${FRONTEND_RUN_DIR}/coverage" ]] && rm -rf "${ART_DIR}/frontend/latest/coverage" && cp -R "${FRONTEND_RUN_DIR}/coverage" "${ART_DIR}/frontend/latest/coverage" || true

echo "Done. Artifacts at: ${ART_DIR}"
echo "Run id: ${RUN_ID}"
