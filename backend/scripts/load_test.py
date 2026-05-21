from __future__ import annotations

import argparse
import asyncio
import statistics
import time
from dataclasses import dataclass
from datetime import date as dt_date

import httpx


@dataclass
class RunResult:
    total: int
    ok: int
    errors: int
    latencies_ms: list[float]

    def percentile_ms(self, p: float) -> float:
        if not self.latencies_ms:
            return 0.0
        data = sorted(self.latencies_ms)
        idx = int(round((p / 100.0) * (len(data) - 1)))
        return float(data[max(0, min(len(data) - 1, idx))])


async def _run_rps(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict[str, str],
    rps: int,
    duration_s: int,
    concurrency: int,
) -> RunResult:
    latencies: list[float] = []
    ok = 0
    errors = 0
    semaphore = asyncio.Semaphore(concurrency)

    start = time.perf_counter()
    end = start + duration_s

    async def one() -> None:
        nonlocal ok, errors
        async with semaphore:
            t0 = time.perf_counter()
            try:
                resp = await client.get(url, headers=headers)
                dt = (time.perf_counter() - t0) * 1000.0
                latencies.append(dt)
                if 200 <= resp.status_code < 300:
                    ok += 1
                else:
                    errors += 1
            except Exception:
                dt = (time.perf_counter() - t0) * 1000.0
                latencies.append(dt)
                errors += 1

    tasks: list[asyncio.Task] = []
    spacing = 1.0 / max(1, rps)
    while time.perf_counter() < end:
        tasks.append(asyncio.create_task(one()))
        await asyncio.sleep(spacing)

    await asyncio.gather(*tasks)
    total = ok + errors
    return RunResult(total=total, ok=ok, errors=errors, latencies_ms=latencies)


def _print_summary(name: str, result: RunResult) -> None:
    error_rate = (result.errors / max(1, result.total)) * 100.0
    p50 = result.percentile_ms(50)
    p95 = result.percentile_ms(95)
    p99 = result.percentile_ms(99)
    mean = statistics.fmean(result.latencies_ms) if result.latencies_ms else 0.0
    print(f"{name}: total={result.total} ok={result.ok} errors={result.errors} error_rate={error_rate:.2f}%")
    print(f"  latency_ms: mean={mean:.2f} p50={p50:.2f} p95={p95:.2f} p99={p99:.2f}")


def main() -> int:
    parser = argparse.ArgumentParser(description="RPS-controlled load test for HealthSync endpoints.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Base URL (default: http://127.0.0.1:8000)")
    parser.add_argument("--token", required=True, help="Firebase ID token for Authorization: Bearer")
    parser.add_argument("--rps", type=int, default=50, help="Target requests/sec (default: 50)")
    parser.add_argument("--duration", type=int, default=60, help="Run duration seconds (default: 60)")
    parser.add_argument("--concurrency", type=int, default=100, help="Max in-flight requests (default: 100)")
    parser.add_argument("--date", default=dt_date.today().isoformat(), help="Dashboard date param (YYYY-MM-DD)")
    args = parser.parse_args()

    headers = {"Authorization": f"Bearer {args.token}"}
    meals_url = f"{args.base_url}/api/v1/meals?pageSize=100"
    dashboard_url = f"{args.base_url}/api/v1/dashboard?date={args.date}"

    async def run() -> None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            meals = await _run_rps(
                client,
                meals_url,
                headers=headers,
                rps=args.rps,
                duration_s=args.duration,
                concurrency=args.concurrency,
            )
            _print_summary("GET /api/v1/meals?pageSize=100", meals)

            dash = await _run_rps(
                client,
                dashboard_url,
                headers=headers,
                rps=args.rps,
                duration_s=args.duration,
                concurrency=args.concurrency,
            )
            _print_summary("GET /api/v1/dashboard", dash)

    asyncio.run(run())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
