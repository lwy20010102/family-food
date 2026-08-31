from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

WeeklyMenuMealType = Literal["breakfast", "lunch", "dinner"]


class WeeklyMenuRecipePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    image_url: str | None
    default_servings: int
    cooking_time: int | None
    difficulty: str


class WeeklyMenuItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    menu_date: date
    meal_type: WeeklyMenuMealType
    recipe_id: int
    servings: int
    created_at: datetime
    updated_at: datetime
    recipe: WeeklyMenuRecipePublic


class WeeklyMenuDayPublic(BaseModel):
    menu_date: date
    items: list[WeeklyMenuItemPublic] = Field(default_factory=list)


class WeeklyMenuWeekResponse(BaseModel):
    week_start: date
    week_end: date
    days: list[WeeklyMenuDayPublic] = Field(default_factory=list)


class WeeklyMenuItemCreateRequest(BaseModel):
    menu_date: date
    meal_type: WeeklyMenuMealType
    recipe_id: int = Field(ge=1)
    servings: int = Field(default=2, ge=1, le=20)


class WeeklyMenuItemServingsUpdateRequest(BaseModel):
    servings: int = Field(ge=1, le=20)


class WeeklyMenuItemResponse(BaseModel):
    item: WeeklyMenuItemPublic
