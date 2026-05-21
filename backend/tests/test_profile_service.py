from __future__ import annotations


class TestProfileService:
    def test_get_profile_returns_none_when_missing(self, mock_db, uid, mocker):
        from app.services.profile_service import get_profile

        snap = mocker.MagicMock()
        snap.exists = False
        mocker.patch("app.services.profile_service.get_profile_snapshot", return_value=snap)

        assert get_profile(mock_db, uid) is None

    def test_upsert_profile_sets_fields_and_returns_profile(self, mock_db, uid, mocker):
        from app.schemas.profile import ProfileUpsert
        from app.services.profile_service import upsert_profile

        ref = mocker.MagicMock()
        existing = mocker.MagicMock()
        existing.exists = False
        updated = mocker.MagicMock()
        updated.to_dict.return_value = {
            "fullName": "Alex",
            "age": 22,
            "dietaryPreferences": ["Vegetarian"],
            "allergies": ["Peanuts"],
        }
        ref.get.side_effect = [existing, updated]
        mocker.patch("app.services.profile_service.profile_ref", return_value=ref)

        result = upsert_profile(
            mock_db,
            uid,
            ProfileUpsert(
                fullName=" Alex ",
                age=22,
                dietaryPreferences=[" Vegetarian ", "vegetarian"],
                allergies=["Peanuts", ""],
            ),
        )

        assert result["id"] == "main"
        assert result["fullName"] == "Alex"
        assert result["age"] == 22

