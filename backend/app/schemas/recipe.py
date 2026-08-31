from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserPublic

RecipeCategory = Literal["肉类", "海鲜", "蔬菜", "主食", "汤", "早餐", "甜品", "其他"]
RecipeDifficulty = Literal["简单", "中等", "困难"]
RecipeIngredientType = Literal["ingredient", "seasoning"]
RecipeSourceType = Literal["manual", "ai_text", "ai_video"]


class RecipeIngredientBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: str = Field(default="", max_length=50)
    unit: str = Field(default="", max_length=20)
    type: RecipeIngredientType = "ingredient"
    sort_order: int = 0


class RecipeStepBase(BaseModel):
    step_number: int = Field(ge=1)
    description: str = Field(min_length=1, max_length=1000)
    duration: str | None = Field(default=None, max_length=50)


class RecipeIngredientPublic(RecipeIngredientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class RecipeStepPublic(RecipeStepBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class RecipeBase(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    category: RecipeCategory = "其他"
    image_url: str | None = Field(default=None, max_length=255)
    default_servings: int = Field(default=2, ge=1, le=20)
    cooking_time: int | None = Field(default=None, ge=1, le=1440)
    difficulty: RecipeDifficulty = "简单"
    tips: list[str] = Field(default_factory=list)
    source_type: RecipeSourceType = "manual"
    ingredients: list[RecipeIngredientBase] = Field(default_factory=list)
    steps: list[RecipeStepBase] = Field(default_factory=list)


class RecipeCreateRequest(RecipeBase):
    pass


class RecipeUpdateRequest(RecipeBase):
    pass


class RecipeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    family_id: int
    creator_id: int
    title: str
    description: str
    category: str
    image_url: str | None
    default_servings: int
    cooking_time: int | None
    difficulty: str
    tips: list[str]
    source_type: str
    created_at: datetime
    updated_at: datetime
    creator: UserPublic
    ingredient_count: int = 0
    step_count: int = 0
    is_favorite: bool = False
    preference_match: bool = False
    preference_reasons: list[str] = Field(default_factory=list)
    preference_warnings: list[str] = Field(default_factory=list)


class RecipeDetail(RecipeSummary):
    ingredients: list[RecipeIngredientPublic]
    steps: list[RecipeStepPublic]


class RecipesResponse(BaseModel):
    recipes: list[RecipeSummary] = Field(default_factory=list)


class RecipeResponse(BaseModel):
    recipe: RecipeDetail


class RecipeFavoriteResponse(BaseModel):
    recipe_id: int
    is_favorite: bool


class RecipeHistoryItem(BaseModel):
    recipe: RecipeSummary
    viewed_at: datetime


class RecipeHistoryResponse(BaseModel):
    items: list[RecipeHistoryItem] = Field(default_factory=list)


class RecipeDeleteResponse(BaseModel):
    message: str
