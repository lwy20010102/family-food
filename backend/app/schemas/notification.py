from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserPublic


class NotificationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    sender_id: int
    receiver_id: int
    type: str
    title: str
    content: str
    related_id: int | None
    link_url: str | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime
    sender: UserPublic


class NotificationsResponse(BaseModel):
    notifications: list[NotificationPublic] = Field(default_factory=list)
    unread_count: int = 0


class NotificationResponse(BaseModel):
    notification: NotificationPublic
