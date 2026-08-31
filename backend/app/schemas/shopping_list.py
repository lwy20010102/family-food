from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.daily_menu import DailyMenuPublic


class ShoppingListItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    amount: str
    unit: str
    is_purchased: bool


class ShoppingListPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    menu_date: date
    created_at: datetime
    items: list[ShoppingListItemPublic]


class ShoppingListTodayResponse(BaseModel):
    shopping_list: ShoppingListPublic | None = None
    menu: DailyMenuPublic | None = None


class ShoppingListItemUpdateRequest(BaseModel):
    is_purchased: bool


class ShoppingListItemResponse(BaseModel):
    item: ShoppingListItemPublic


class ShoppingListResetResponse(BaseModel):
    shopping_list: ShoppingListPublic | None = None
