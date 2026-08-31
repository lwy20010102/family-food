from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserPublic
from app.schemas.dish_order import DishOrderPublic, DishOrderRecipePublic

DailyMenuStatus = Literal["draft", "confirmed"]
DailyMenuItemStatus = Literal["planned", "cooking", "served", "cancelled"]
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
    confirmed_by_id: int | None
    confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    confirmed_by: UserPublic | None
    items: list[DailyMenuItemPublic]


class DailyMenuTodayResponse(BaseModel):
    menu: DailyMenuPublic | None = None
    orders: list[DishOrderPublic] = Field(default_factory=list)


class DailyMenuConfirmRequest(BaseModel):
    recipe_ids: list[int] = Field(min_length=1, max_length=20)
    servings: int = Field(default=2, ge=1, le=20)


class DailyMenuItemStatusUpdateRequest(BaseModel):
    status: DailyMenuItemStatus


class DailyMenuResponse(BaseModel):
    menu: DailyMenuPublic


class DailyMenuItemResponse(BaseModel):
    item: DailyMenuItemPublic
