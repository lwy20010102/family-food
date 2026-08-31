from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class WeeklyMenuItem(Base):
    __tablename__ = "weekly_menu_items"
    __table_args__ = (
        UniqueConstraint(
            "family_id",
            "menu_date",
            "meal_type",
            "recipe_id",
            name="uq_weekly_menu_items_workspace_date_meal_recipe",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"),
        index=True,
        nullable=False,
    )
    menu_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    servings: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
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
    recipe = relationship("Recipe", back_populates="weekly_menu_items")
