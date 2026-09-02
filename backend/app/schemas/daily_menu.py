from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserPublic
from app.schemas.dish_order import DishOrderPublic, DishOrderRecipePublic

DailyMenuStatus = Literal["draft", "confirmed"]
DailyMenuItemStatus = Literal["planned", "cooking", "served", "cancelled"]
DailyMenuFeedbackPreference = Literal["want", "avoid"]
DailyMenuFeedbackChoice = Literal["want", "avoid", "none"]
DailyMenuItemRecipePublic = DishOrderRecipePublic


class DailyMenuItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    daily_menu_id: int
    recipe_id: int
    status: DailyMenuItemStatus
    sort_order: int
    recipe: DailyMenuItemRecipePublic


class DailyMenuPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    menu_date: date
    status: DailyMenuStatus
    servings: int
    meal_time: str
    confirmed_by_id: int | None
    confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    confirmed_by: UserPublic | None
    items: list[DailyMenuItemPublic]


class DailyMenuFeedbackPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    user_id: int
    recipe_id: int
    feedback_date: date
    preference: DailyMenuFeedbackPreference
    created_at: datetime
    updated_at: datetime
    user: UserPublic


class DailyMenuFeedbackRequest(BaseModel):
    recipe_id: int
    preference: DailyMenuFeedbackChoice


class DailyMenuFeedbackResponse(BaseModel):
    feedback: DailyMenuFeedbackPublic | None = None


class DailyMenuViewPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    daily_menu_id: int
    family_id: int
    user_id: int
    viewed_at: datetime
    user: UserPublic


class DailyMenuViewRequest(BaseModel):
    viewed: bool = True


class DailyMenuViewResponse(BaseModel):
    view: DailyMenuViewPublic | None = None


class DailyMenuVersionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    daily_menu_id: int
    family_id: int
    menu_date: date
    version_number: int
    servings: int
    meal_time: str
    recipe_ids: list[int] = Field(default_factory=list)
    recipe_titles: list[str] = Field(default_factory=list)
    confirmed_by_id: int | None
    confirmed_at: datetime | None
    created_at: datetime
    confirmed_by: UserPublic | None


class DailyMenuTodayResponse(BaseModel):
    menu: DailyMenuPublic | None = None
    orders: list[DishOrderPublic] = Field(default_factory=list)
    feedbacks: list[DailyMenuFeedbackPublic] = Field(default_factory=list)
    menu_views: list[DailyMenuViewPublic] = Field(default_factory=list)
    menu_versions: list[DailyMenuVersionPublic] = Field(default_factory=list)


class DailyMenuConfirmRequest(BaseModel):
    recipe_ids: list[int] = Field(min_length=1, max_length=20)
    servings: int = Field(default=2, ge=1, le=20)
    meal_time: str = Field(default="18:30", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")


class DailyMenuItemStatusUpdateRequest(BaseModel):
    status: DailyMenuItemStatus


class DailyMenuResponse(BaseModel):
    menu: DailyMenuPublic


class DailyMenuVersionResponse(BaseModel):
    version: DailyMenuVersionPublic


class DailyMenuItemResponse(BaseModel):
    item: DailyMenuItemPublic
