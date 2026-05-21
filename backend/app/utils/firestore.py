from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def to_iso(value: Any) -> Any:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value


def serialize_document(data: dict[str, Any]) -> dict[str, Any]:
    return {key: to_iso(value) for key, value in data.items()}
