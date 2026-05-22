#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ART_DIR="${ROOT_DIR}/artifacts/backend"
RUN_ID="${CIT_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo unknown)-$$}"
RUN_DIR="${ART_DIR}/runs/${RUN_ID}"

mkdir -p "${RUN_DIR}" "${ART_DIR}/latest"

cd "${ROOT_DIR}/backend"

python -c "import pytest_cov, pytest_jsonreport" >/dev/null 2>&1 && HAVE_REPORTERS=1 || HAVE_REPORTERS=0
if [[ "${HAVE_REPORTERS}" -eq 0 && "${CIT_AUTO_INSTALL_PYTEST_REPORTERS:-1}" -eq 1 ]]; then
  echo "==> Installing pytest-cov + pytest-json-report to enable coverage/telemetry"
  python -m pip install -q pytest-cov pytest-json-report >"${RUN_DIR}/pip-install.log" 2>&1 || true
  python -c "import pytest_cov, pytest_jsonreport" >/dev/null 2>&1 && HAVE_REPORTERS=1 || HAVE_REPORTERS=0
fi

if [[ "${HAVE_REPORTERS}" -eq 1 ]]; then
  {
    echo "## CIT backend test log"
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "python=$(python -V 2>&1)"
    echo "run_id=${RUN_ID}"
    echo
  } >"${RUN_DIR}/pytest.log"
  python -m pytest -vv -rA tests/cit \
    --capture=tee-sys \
    --showlocals --tb=long \
    -o log_cli=true -o log_cli_level=INFO \
    --junitxml="${RUN_DIR}/pytest-junit.xml" \
    --json-report --json-report-file="${RUN_DIR}/pytest-report.json" \
    --cov=app --cov-report="xml:${RUN_DIR}/coverage.xml" --cov-report=term-missing \
    --durations=0 2>&1 | tee -a "${RUN_DIR}/pytest.log"
else
  {
    echo "## CIT backend test log"
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "python=$(python -V 2>&1)"
    echo "run_id=${RUN_ID}"
    echo
    echo "WARN: pytest-cov / pytest-json-report not available; coverage + JSON/JUnit telemetry disabled."
    [[ -f "${RUN_DIR}/pip-install.log" ]] && echo "      pip details: ${RUN_DIR}/pip-install.log"
    echo "      Fix: activate your venv and run: python -m pip install -r requirements.txt"
    echo
  } >"${RUN_DIR}/pytest.log"
  python -m pytest -vv -rA tests/cit \
    --capture=tee-sys \
    --showlocals --tb=long \
    -o log_cli=true -o log_cli_level=INFO \
    --durations=0 2>&1 | tee -a "${RUN_DIR}/pytest.log"
fi

cp -f "${RUN_DIR}/pytest.log" "${ART_DIR}/latest/pytest.log" 2>/dev/null || true
[[ -f "${RUN_DIR}/pytest-junit.xml" ]] && cp -f "${RUN_DIR}/pytest-junit.xml" "${ART_DIR}/latest/pytest-junit.xml" || true
[[ -f "${RUN_DIR}/pytest-report.json" ]] && cp -f "${RUN_DIR}/pytest-report.json" "${ART_DIR}/latest/pytest-report.json" || true
[[ -f "${RUN_DIR}/coverage.xml" ]] && cp -f "${RUN_DIR}/coverage.xml" "${ART_DIR}/latest/coverage.xml" || true

echo "Run id: ${RUN_ID}"
