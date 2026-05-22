#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ART_DIR="${ROOT_DIR}/artifacts/frontend"
RUN_ID="${CIT_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo unknown)-$$}"
RUN_DIR="${ART_DIR}/runs/${RUN_ID}"

mkdir -p "${RUN_DIR}" "${ART_DIR}/latest"

cd "${ROOT_DIR}/frontend"

node -e "require.resolve('@vitest/coverage-v8')" >/dev/null 2>&1 && HAVE_V8_COV=1 || HAVE_V8_COV=0
if [[ "${HAVE_V8_COV}" -eq 0 && "${CIT_AUTO_INSTALL_VITEST_COVERAGE_V8:-1}" -eq 1 ]]; then
  echo "==> Installing @vitest/coverage-v8 (no-save) to enable coverage metrics"
  VITEST_VERSION="$(node -e "console.log(require('vitest/package.json').version)" 2>/dev/null || true)"
  if [[ -n "${VITEST_VERSION}" ]]; then
    npm install --no-save "@vitest/coverage-v8@${VITEST_VERSION}" >"${RUN_DIR}/npm-install.log" 2>&1 || true
  else
    npm install --no-save @vitest/coverage-v8 >"${RUN_DIR}/npm-install.log" 2>&1 || true
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
  } >"${RUN_DIR}/vitest.log"
  npx vitest run --reporter=verbose src/tests/cit \
    --coverage \
    --coverage.provider=v8 \
    --coverage.reportsDirectory="${RUN_DIR}/coverage" \
    --coverage.reporter=text \
    --coverage.reporter=json \
    --coverage.reporter=lcov \
    --coverage.reporter=cobertura \
    --reporter=junit \
    --reporter=json \
    --outputFile.junit="${RUN_DIR}/vitest-junit.xml" \
    --outputFile.json="${RUN_DIR}/vitest-report.json" \
    --logHeapUsage --printConsoleTrace \
    2>&1 | tee -a "${RUN_DIR}/vitest.log"
  if [[ -d "${RUN_DIR}/coverage" ]]; then
    echo "" | tee -a "${RUN_DIR}/vitest.log" >/dev/null
    echo "coverage_dir=${RUN_DIR}/coverage" | tee -a "${RUN_DIR}/vitest.log" >/dev/null
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
    echo "WARN: @vitest/coverage-v8 not installed; no coverage metrics will be produced."
    echo "      Install it once with: cd frontend && npm i -D @vitest/coverage-v8"
    echo "      Or rerun with: CIT_AUTO_INSTALL_VITEST_COVERAGE_V8=1"
    [[ -f "${RUN_DIR}/npm-install.log" ]] && echo "      npm details: ${RUN_DIR}/npm-install.log"
    echo
  } >"${RUN_DIR}/vitest.log"
  npx vitest run --reporter=verbose src/tests/cit \
    --reporter=junit \
    --reporter=json \
    --outputFile.junit="${RUN_DIR}/vitest-junit.xml" \
    --outputFile.json="${RUN_DIR}/vitest-report.json" \
    --logHeapUsage --printConsoleTrace \
    2>&1 | tee -a "${RUN_DIR}/vitest.log"
fi

if [[ -f "${RUN_DIR}/vitest-report.json" ]]; then
  node -e 'const fs=require("fs");const p=process.argv[1];const r=JSON.parse(fs.readFileSync(p,"utf8"));console.log("\\n== Vitest Telemetry Summary ==");console.log(`suites_total=${r.numTotalTestSuites} suites_passed=${r.numPassedTestSuites} suites_failed=${r.numFailedTestSuites}`);console.log(`tests_total=${r.numTotalTests} tests_passed=${r.numPassedTests} tests_failed=${r.numFailedTests} tests_pending=${r.numPendingTests}`);console.log(`run_startTime_ms=${r.startTime} success=${r.success}`);console.log("\\nPer-test durations (ms):");(r.testResults||[]).forEach(tr=>{(tr.assertionResults||[]).forEach(a=>{const name=a.fullName||a.title;const dur=a.duration??0;console.log(`${dur}\\t${name}`);});});' "${RUN_DIR}/vitest-report.json" | tee -a "${RUN_DIR}/vitest.log"
fi

cp -f "${RUN_DIR}/vitest.log" "${ART_DIR}/latest/vitest.log" 2>/dev/null || true
cp -f "${RUN_DIR}/vitest-junit.xml" "${ART_DIR}/latest/vitest-junit.xml" 2>/dev/null || true
cp -f "${RUN_DIR}/vitest-report.json" "${ART_DIR}/latest/vitest-report.json" 2>/dev/null || true
[[ -d "${RUN_DIR}/coverage" ]] && rm -rf "${ART_DIR}/latest/coverage" && cp -R "${RUN_DIR}/coverage" "${ART_DIR}/latest/coverage" || true

echo "Run id: ${RUN_ID}"
