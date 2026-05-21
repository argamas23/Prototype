"""Observability primitives kept zero-dependency on purpose.

Ships a tiny Prometheus text-format exporter rather than pulling in
`prometheus_client` — the goal is to demonstrate the pattern inside the
codebase and keep the deploy surface small. If the project ever needs
histograms, push gateway support, or multi-process aggregation, swap this
module out behind the same `MetricsRegistry` API.
"""

from app.observability.metrics import (
    MetricsRegistry,
    get_metrics,
    register_metrics_endpoint,
    register_metrics_middleware,
)

__all__ = [
    "MetricsRegistry",
    "get_metrics",
    "register_metrics_endpoint",
    "register_metrics_middleware",
]
