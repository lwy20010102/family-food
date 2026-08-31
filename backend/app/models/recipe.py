from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"),
        index=True,
        nullable=False,
    )
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_servings: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    cooking_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="简单")
    tips: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    source_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="manual",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    family = relationship("Family")
    creator = relationship("User")
    ingredients = relationship(
        "RecipeIngredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.sort_order",
    )
    steps = relationship(
        "RecipeStep",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeStep.step_number",
    )
    dish_orders = relationship(
        "DishOrder",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )
    favorites = relationship(
        "RecipeFavorite",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )
    view_history = relationship(
        "RecipeViewHistory",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )
    weekly_menu_items = relationship(
        "WeeklyMenuItem",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )

    @property
    def ingredient_count(self) -> int:
        return len(self.ingredients)

    @property
    def step_count(self) -> int:
        return len(self.steps)


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="ingredient")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    recipe = relationship("Recipe", back_populates="ingredients")


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id"),
        index=True,
        nullable=False,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    duration: Mapped[str | None] = mapped_column(String(50), nullable=True)

    recipe = relationship("Recipe", back_populates="steps")
