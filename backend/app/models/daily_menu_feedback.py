from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DailyMenuFeedback(Base):
    """One family member's preference for a recipe on today's menu."""

    __tablename__ = "daily_menu_feedbacks"
    __table_args__ = (
        UniqueConstraint(
            "family_id",
            "user_id",
            "recipe_id",
            "feedback_date",
            name="uq_daily_menu_feedbacks_family_user_recipe_date",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id"),
        index=True,
        nullable=False,
    )
    feedback_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
        default=date.today,
    )
    preference: Mapped[str] = mapped_column(String(10), nullable=False)
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
    user = relationship("User")
    recipe = relationship("Recipe")
