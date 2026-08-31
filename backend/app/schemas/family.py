from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserPublic

FamilyRole = Literal["owner", "member"]


class FamilyPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    invite_code: str
    creator_id: int
    created_at: datetime
    updated_at: datetime


class FamilyMemberPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: FamilyRole
    nickname: str
    joined_at: datetime
    user: UserPublic


class CreateFamilyRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class JoinFamilyRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=16)


class CurrentFamilyResponse(BaseModel):
    family: FamilyPublic | None = None
    members: list[FamilyMemberPublic] = Field(default_factory=list)


class FamilyMembersResponse(BaseModel):
    members: list[FamilyMemberPublic] = Field(default_factory=list)
