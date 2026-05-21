from __future__ import annotations

from typing import Any


def data_response(data: Any) -> dict:
    return {"data": data}


def list_response(items: list, page: int, page_size: int, total: int) -> dict:
    return {
        "items": items,
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": max(1, -(-total // page_size)),
    }
