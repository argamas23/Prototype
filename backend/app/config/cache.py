"""Cache-Aside pattern with a pluggable backend.

Two backends ship in-tree:
  * InMemoryTTLCache — per-process dict with TTL. Zero-config default.
  * RedisCache       — opt-in via REDIS_URL env var. Shared across workers.

Consumers (services) depend only on the `Cache` protocol, so swapping backends
never touches call sites (Dependency Inversion Principle).
"""

from __future__ import annotations

import json
import os
import threading
import time
from functools import lru_cache
from typing import Any, Protocol


class Cache(Protocol):
    def get(self, key: str) -> Any | None: ...
    def set(self, key: str, value: Any, ttl_seconds: int) -> None: ...
    def invalidate(self, key: str) -> None: ...
    def invalidate_prefix(self, prefix: str) -> None: ...


class InMemoryTTLCache:
    """Thread-safe TTL cache. Good enough for a single-process dev/demo setup."""

    def __init__(self, max_entries: int = 1024) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self._max = max_entries

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at < now:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        expires_at = time.monotonic() + max(1, ttl_seconds)
        with self._lock:
            if len(self._store) >= self._max:
                # Evict the oldest-expiring entry — approximate LRU/TTL hybrid.
                oldest = min(self._store.items(), key=lambda kv: kv[1][0])[0]
                self._store.pop(oldest, None)
            self._store[key] = (expires_at, value)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            for key in [k for k in self._store if k.startswith(prefix)]:
                self._store.pop(key, None)


class RedisCache:
    """Thin wrapper around redis-py. Only imported when REDIS_URL is set."""

    def __init__(self, url: str) -> None:
        import redis  # noqa: WPS433 — lazy import, optional dep

        self._client = redis.Redis.from_url(url, decode_responses=True)

    def get(self, key: str) -> Any | None:
        raw = self._client.get(key)
        return None if raw is None else json.loads(raw)

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._client.setex(key, max(1, ttl_seconds), json.dumps(value, default=str))

    def invalidate(self, key: str) -> None:
        self._client.delete(key)

    def invalidate_prefix(self, prefix: str) -> None:
        for key in self._client.scan_iter(match=f"{prefix}*"):
            self._client.delete(key)


@lru_cache
def get_cache() -> Cache:
    """Single entry-point. Picks backend from env; memoized for process lifetime."""
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            return RedisCache(redis_url)
        except Exception:
            # Fail open: never block the request path because Redis is down.
            pass
    return InMemoryTTLCache()


def user_key(namespace: str, uid: str, *parts: str) -> str:
    """Standardized cache key — makes prefix invalidation predictable."""
    tail = ":".join(parts) if parts else ""
    return f"{namespace}:{uid}:{tail}" if tail else f"{namespace}:{uid}:"
