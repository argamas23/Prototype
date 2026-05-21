from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

Gender = Literal["Male", "Female", "Other", "PreferNotToSay"]

_NO_NUL_PATTERN = r"^[^\x00]*$"


def _bounded_str_list(values: list[str], *, max_items: int, max_item_len: int) -> list[str]:
    if len(values) > max_items:
        raise ValueError(f"List too large (max {max_items} items).")
    for item in values:
        if not isinstance(item, str):
            raise ValueError("List items must be strings.")
        if "\x00" in item:
            raise ValueError("List items may not contain NUL bytes.")
        if len(item) > max_item_len:
            raise ValueError(f"List items too long (max {max_item_len} chars).")
    return values


class ProfileUpsert(BaseModel):
    fullName: str | None = Field(default=None, min_length=1, max_length=100, pattern=_NO_NUL_PATTERN)
    age: int | None = Field(default=None, ge=0, le=125)
    gender: Gender | None = None
    heightCm: float | None = Field(default=None, ge=0, le=300)
    weightKg: float | None = Field(default=None, ge=0, le=500)
    dietaryPreferences: list[str] = Field(default_factory=list, max_length=25)
    allergies: list[str] = Field(default_factory=list, max_length=25)

    @field_validator("dietaryPreferences", "allergies")
    @classmethod
    def _validate_lists(cls, v: list[str]) -> list[str]:
        return _bounded_str_list(v, max_items=25, max_item_len=64)


class ProfileOut(ProfileUpsert):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    createdAt: str | None = None
    updatedAt: str | None = None
