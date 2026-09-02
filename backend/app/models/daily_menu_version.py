from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DailyMenuVersion(Base):
    """Immutable snapshot of a published daily menu before it was replaced."""

    __tablename__ = "daily_menu_versions"
    __table_args__ = (
        UniqueConstraint(
            "daily_menu_id",
            "version_number",
            name="uq_daily_menu_versions_menu_version",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    daily_menu_id: Mapped[int] = mapped_column(
        ForeignKey("daily_menus.id"),
        index=True,
        nullable=False,
    )
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"),
        index=True,
        nullable=False,
    )
    menu_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    servings: Mapped[int] = mapped_column(Integer, nullable=False)
    meal_time: Mapped[str] = mapped_column(String(5), nullable=False)
    recipe_ids: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    recipe_titles: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    confirmed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=True,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    menu = relationship("DailyMenu", back_populates="versions")
    family = relationship("Family")
    confirmed_by = relationship("User")
