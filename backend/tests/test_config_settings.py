from __future__ import annotations

from app.config.config import Settings


def _build_settings(allowed_origins: str) -> Settings:
    return Settings(
        firebase_project_id="test-project",
        firebase_storage_bucket="test-project.appspot.com",
        google_application_credentials="security/test-service-account.json",
        allowed_origins=allowed_origins,
    )


class TestCorsOrigins:
    def test_wildcard_is_preserved(self):
        settings = _build_settings("*")

        assert settings.cors_origins == ["*"]

    def test_non_loopback_origin_is_preserved(self):
        settings = _build_settings("https://example.com")

        assert settings.cors_origins == ["https://example.com"]

    def test_loopback_origin_expands_to_localhost_127_and_ipv6(self):
        settings = _build_settings("http://localhost:5173")

        assert settings.cors_origins == [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://[::1]:5173",
        ]

    def test_loopback_aliases_are_deduplicated(self):
        settings = _build_settings("http://localhost:5173,http://127.0.0.1:5173")

        assert settings.cors_origins == [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://[::1]:5173",
        ]
