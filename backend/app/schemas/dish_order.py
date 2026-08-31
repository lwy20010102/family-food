from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserPublic

DishOrderStatus = Literal["pending", "viewed", "confirmed", "rejected", "completed"]


class DishOrderRecipePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    image_url: str | None
    default_servings: int
    cooking_time: int | None
    difficulty: str


class DishOrderPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    user_id: int
    recipe_id: int
    order_date: date
    status: DishOrderStatus
    created_at: datetime
    user: UserPublic
    recipe: DishOrderRecipePublic


class DishOrdersResponse(BaseModel):
    orders: list[DishOrderPublic] = Field(default_factory=list)


class DishOrderCreateRequest(BaseModel):
    recipe_ids: list[int] = Field(min_length=1, max_length=20)


class DishOrderStatusUpdateRequest(BaseModel):
    status: DishOrderStatus


class DishOrderResponse(BaseModel):
    order: DishOrderPublic
