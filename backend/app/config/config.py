from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict

LOOPBACK_HOSTS = ("localhost", "127.0.0.1", "::1")


def _normalize_origin(origin: str) -> str:
    value = origin.strip()
    if not value:
        return value

    parsed = urlsplit(value)
    if not parsed.scheme or parsed.hostname is None:
        return value

    hostname = parsed.hostname
    host = f"[{hostname}]" if ":" in hostname else hostname
    netloc = f"{host}:{parsed.port}" if parsed.port is not None else host
    return urlunsplit((parsed.scheme, netloc, "", "", ""))


def _expand_loopback_aliases(origin: str) -> list[str]:
    parsed = urlsplit(origin)
    if parsed.hostname not in LOOPBACK_HOSTS:
        return [origin]

    expanded: list[str] = []
    for hostname in LOOPBACK_HOSTS:
        host = f"[{hostname}]" if ":" in hostname else hostname
        netloc = f"{host}:{parsed.port}" if parsed.port is not None else host
        expanded.append(urlunsplit((parsed.scheme, netloc, "", "", "")))
    return expanded


class Settings(BaseSettings):
    firebase_project_id: str
    firebase_storage_bucket: str
    google_application_credentials: str
    environment: str = "dev"
    log_level: str = "INFO"
    allowed_origins: str = "*"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def backend_root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    @property
    def service_account_path(self) -> Path:
        path = Path(self.google_application_credentials)
        if path.is_absolute():
            return path
        return (self.backend_root / path).resolve()

    @property
    def cors_origins(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]

        origins = [
            _normalize_origin(o) for o in self.allowed_origins.split(",") if o.strip()
        ]
        if "*" in origins:
            return ["*"]

        expanded: list[str] = []
        for origin in origins:
            expanded.extend(_expand_loopback_aliases(origin))
        return list(dict.fromkeys(expanded))


@lru_cache
def get_settings() -> Settings:
    return Settings()
