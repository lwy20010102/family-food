from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


RecipeImportIssueSeverity = Literal["error", "warning"]


class RecipeImportIssue(BaseModel):
    severity: RecipeImportIssueSeverity
    sheet: str
    row: int | None = None
    field: str | None = None
    message: str


class RecipeImportPreviewItem(BaseModel):
    recipe_key: str
    title: str
    description: str
    category: str
    image_url: str | None = None
    default_servings: int | None = None
    cooking_time: int | None = None
    difficulty: str
    source_type: str
    source_url: str | None = None
    status: str
    ingredient_count: int = 0
    step_count: int = 0
    data_note: str | None = None


class RecipeImportPreview(BaseModel):
    filename: str
    file_size_bytes: int = Field(ge=0)
    sheets: list[str] = Field(default_factory=list)
    recipes_total: int = 0
    recipes_importable: int = 0
    recipes_draft: int = 0
    ingredient_rows: int = 0
    step_rows: int = 0
    recipes: list[RecipeImportPreviewItem] = Field(default_factory=list)
    errors: list[RecipeImportIssue] = Field(default_factory=list)
    warnings: list[RecipeImportIssue] = Field(default_factory=list)
    can_import: bool = False
    truncated: bool = False


class RecipeImportResultItem(BaseModel):
    recipe_key: str
    title: str
    action: Literal["created", "updated"]
    ingredient_count: int
    step_count: int


class RecipeImportResult(BaseModel):
    filename: str
    imported_count: int = 0
    created_count: int = 0
    updated_count: int = 0
    items: list[RecipeImportResultItem] = Field(default_factory=list)
