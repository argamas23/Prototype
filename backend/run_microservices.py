#!/usr/bin/env python3
"""Start all backend microservices plus the API gateway with one command."""

from __future__ import annotations

import argparse
import importlib.util
import os
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ServiceConfig:
    name: str
    app: str
    port: int


SERVICES: list[ServiceConfig] = [
    ServiceConfig("meals", "microservices.meals.main:app", 8001),
    ServiceConfig("workouts", "microservices.workouts.main:app", 8002),
    ServiceConfig("goals", "microservices.goals.main:app", 8003),
    ServiceConfig("dashboard", "microservices.dashboard.main:app", 8004),
    ServiceConfig("profile", "microservices.profile.main:app", 8005),
    ServiceConfig("analytics", "microservices.analytics.main:app", 8006),
    ServiceConfig("gateway", "microservices.gateway.main:app", 8000),
]


def _find_python_with_uvicorn() -> Path | None:
    backend_root = Path(__file__).resolve().parent
    candidates = [
        backend_root / ".venv" / "bin" / "python",
        backend_root / "venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if not candidate.exists():
            continue
        probe = subprocess.run(
            [str(candidate), "-c", "import uvicorn"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if probe.returncode == 0:
            return candidate
    return None


def _maybe_reexec_with_local_venv(args: argparse.Namespace) -> int | None:
    current = Path(sys.executable).absolute()
    backend_root = Path(__file__).resolve().parent
    alt_python = _find_python_with_uvicorn()
    if alt_python is None:
        return None
    if alt_python.absolute() == current:
        return None

    cmd = [str(alt_python), str(Path(__file__).resolve())]
    if args.no_reload:
        cmd.append("--no-reload")

    print(
        "uvicorn is not installed in the current interpreter.",
        f"Relaunching with local virtualenv: {alt_python}",
    )
    env = os.environ.copy()
    return subprocess.call(cmd, env=env, cwd=backend_root)


def build_cmd(service: ServiceConfig, reload_enabled: bool) -> list[str]:
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        service.app,
        "--host",
        "0.0.0.0",
        "--port",
        str(service.port),
    ]
    if reload_enabled:
        cmd.append("--reload")
    return cmd


def stop_processes(processes: list[tuple[ServiceConfig, subprocess.Popen]]) -> None:
    for _, process in processes:
        if process.poll() is None:
            process.terminate()

    deadline = time.time() + 8
    while time.time() < deadline:
        if all(process.poll() is not None for _, process in processes):
            return
        time.sleep(0.1)

    for _, process in processes:
        if process.poll() is None:
            process.kill()


def run_all(*, reload_enabled: bool, args: argparse.Namespace) -> int:
    if importlib.util.find_spec("uvicorn") is None:
        reexec_rc = _maybe_reexec_with_local_venv(args)
        if reexec_rc is not None:
            return reexec_rc
        print("uvicorn is not installed in the current Python environment.")
        print(
            "Activate your backend virtualenv and run: pip install -r requirements.txt"
        )
        print("Try: ./venv/bin/python run_microservices.py")
        return 1

    processes: list[tuple[ServiceConfig, subprocess.Popen]] = []
    shutdown_started = False

    def shutdown_handler(signum: int, _: object) -> None:
        nonlocal shutdown_started
        if shutdown_started:
            return
        shutdown_started = True
        signal_name = signal.Signals(signum).name
        print(f"\nReceived {signal_name}. Stopping all services...")
        stop_processes(processes)
        print("All services stopped.")
        raise SystemExit(0)

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    print("Starting backend microservices:")
    for service in SERVICES:
        cmd = build_cmd(service, reload_enabled=reload_enabled)
        process = subprocess.Popen(cmd)
        processes.append((service, process))
        mode = "reload on" if reload_enabled else "reload off"
        print(f"  - {service.name:<10} http://127.0.0.1:{service.port} ({mode})")

    print("\nGateway health check: http://127.0.0.1:8000/health")
    print("Press Ctrl+C to stop all services.\n")

    try:
        while True:
            time.sleep(0.5)
            failed = [(svc, proc) for svc, proc in processes if proc.poll() is not None]
            if failed:
                service, process = failed[0]
                print(
                    f"\nService '{service.name}' exited with code {process.returncode}. "
                    "Stopping remaining services..."
                )
                stop_processes(processes)
                return process.returncode or 1
    except SystemExit:
        raise
    except BaseException:
        stop_processes(processes)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run all HealthSync backend microservices and gateway."
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable uvicorn auto-reload for every service.",
    )
    return parser.parse_args()


def main() -> int:
    os.chdir(Path(__file__).resolve().parent)
    args = parse_args()
    return run_all(reload_enabled=not args.no_reload, args=args)


if __name__ == "__main__":
    raise SystemExit(main())
