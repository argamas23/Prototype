from __future__ import annotations

import json
import logging
import logging.config
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key in ("request_id", "method", "path", "status_code", "duration_ms", "client_ip"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def setup_logging(environment: str, log_level: str = "INFO") -> None:
    level = (log_level or "INFO").upper()
    formatter_name = "json" if environment.lower() == "prod" else "text"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "text": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
                },
                "json": {
                    "()": "app.config.logging.JsonFormatter",
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": formatter_name,
                },
            },
            "root": {
                "level": level,
                "handlers": ["default"],
            },
            "loggers": {
                "uvicorn": {"handlers": ["default"], "level": level, "propagate": False},
                "uvicorn.error": {"handlers": ["default"], "level": level, "propagate": False},
                "uvicorn.access": {"handlers": ["default"], "level": level, "propagate": False},
                "app": {"handlers": ["default"], "level": level, "propagate": False},
            },
        }
    )

