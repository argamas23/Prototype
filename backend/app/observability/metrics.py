"""Zero-dependency Prometheus-compatible metrics."""

from __future__ import annotations

import threading
from collections import defaultdict
from functools import lru_cache
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse


class MetricsRegistry:
    """Thread-safe counter + histogram-lite registry.

    Emits Prometheus text format so it can be scraped by any compatible
    collector without an extra client library.
    """

    _HIST_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counters: dict[tuple[str, tuple[tuple[str, str], ...]], float] = defaultdict(float)
        self._hist_counts: dict[tuple[str, tuple[tuple[str, str], ...], float], int] = defaultdict(int)
        self._hist_sum: dict[tuple[str, tuple[tuple[str, str], ...]], float] = defaultdict(float)
        self._hist_total: dict[tuple[str, tuple[tuple[str, str], ...]], int] = defaultdict(int)

    def inc(self, name: str, labels: dict[str, str] | None = None, value: float = 1.0) -> None:
        key = (name, tuple(sorted((labels or {}).items())))
        with self._lock:
            self._counters[key] += value

    def observe(self, name: str, seconds: float, labels: dict[str, str] | None = None) -> None:
        key = (name, tuple(sorted((labels or {}).items())))
        with self._lock:
            for bucket in self._HIST_BUCKETS:
                if seconds <= bucket:
                    self._hist_counts[(name, key[1], bucket)] += 1
            self._hist_sum[key] += seconds
            self._hist_total[key] += 1

    def render(self) -> str:
        lines: list[str] = []
        with self._lock:
            counter_names = {n for n, _ in self._counters}
            for n in sorted(counter_names):
                lines.append(f"# TYPE {n} counter")
                for (name, labelset), val in sorted(self._counters.items()):
                    if name != n:
                        continue
                    lines.append(_fmt(name, dict(labelset), val))

            hist_names = {n for n, _, _ in self._hist_counts}
            for n in sorted(hist_names):
                lines.append(f"# TYPE {n} histogram")
                for (name, labelset, bucket), count in sorted(self._hist_counts.items()):
                    if name != n:
                        continue
                    labels = {**dict(labelset), "le": str(bucket)}
                    lines.append(_fmt(f"{name}_bucket", labels, count))
                for (name, labelset), s in sorted(self._hist_sum.items()):
                    if name != n:
                        continue
                    lines.append(_fmt(f"{name}_sum", dict(labelset), s))
                    lines.append(_fmt(f"{name}_count", dict(labelset), self._hist_total[(name, labelset)]))
        return "\n".join(lines) + "\n"


def _fmt(name: str, labels: dict[str, str], value: float) -> str:
    if not labels:
        return f"{name} {value}"
    pairs = ",".join(f'{k}="{_escape(v)}"' for k, v in sorted(labels.items()))
    return f"{name}{{{pairs}}} {value}"


def _escape(v: str) -> str:
    return v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


@lru_cache
def get_metrics() -> MetricsRegistry:
    return MetricsRegistry()


def register_metrics_middleware(app: FastAPI) -> None:
    """Counts and times every HTTP request, by method + path + status."""
    metrics = get_metrics()

    @app.middleware("http")
    async def _collect(request: Request, call_next):
        start = perf_counter()
        path = request.url.path
        try:
            response = await call_next(request)
        except Exception:
            duration = perf_counter() - start
            labels = {"method": request.method, "path": path, "status": "500"}
            metrics.inc("http_requests_total", labels)
            metrics.observe("http_request_duration_seconds", duration, labels)
            raise
        duration = perf_counter() - start
        labels = {"method": request.method, "path": path, "status": str(response.status_code)}
        metrics.inc("http_requests_total", labels)
        metrics.observe("http_request_duration_seconds", duration, labels)
        return response


def register_metrics_endpoint(app: FastAPI, path: str = "/metrics") -> None:
    @app.get(path, include_in_schema=False)
    async def _metrics() -> PlainTextResponse:
        return PlainTextResponse(get_metrics().render(), media_type="text/plain; version=0.0.4")
