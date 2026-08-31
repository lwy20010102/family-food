from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_terms(value: list[str]) -> list[str]:
    terms: list[str] = []
    seen: set[str] = set()

    for item in value:
        term = item.strip()
        if not term:
            continue
        if len(term) > 50:
            raise ValueError("每条偏好不能超过 50 个字符")
        key = term.casefold()
        if key not in seen:
            seen.add(key)
            terms.append(term)

    return terms


class DietaryPreferenceUpdateRequest(BaseModel):
    liked: list[str] = Field(default_factory=list, max_length=30)
    disliked: list[str] = Field(default_factory=list, max_length=30)
    avoid: list[str] = Field(default_factory=list, max_length=30)

    _normalize_liked = field_validator("liked")(_normalize_terms)
    _normalize_disliked = field_validator("disliked")(_normalize_terms)
    _normalize_avoid = field_validator("avoid")(_normalize_terms)


class DietaryPreferencePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    liked: list[str]
    disliked: list[str]
    avoid: list[str]
    created_at: datetime
    updated_at: datetime


class DietaryPreferenceResponse(BaseModel):
    preference: DietaryPreferencePublic | None = None
