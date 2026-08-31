from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DailyMenu(Base):
    __tablename__ = "daily_menus"
    __table_args__ = (
        UniqueConstraint(
            "family_id",
            "menu_date",
            name="uq_daily_menus_family_menu_date",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"),
        index=True,
        nullable=False,
    )
    menu_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
        default=date.today,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
    )
    servings: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    confirmed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=True,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
    confirmed_by = relationship("User")
    items = relationship(
        "DailyMenuItem",
        back_populates="menu",
        cascade="all, delete-orphan",
        order_by="DailyMenuItem.sort_order",
    )


class DailyMenuItem(Base):
    __tablename__ = "daily_menu_items"
    __table_args__ = (
        UniqueConstraint(
            "daily_menu_id",
            "recipe_id",
            name="uq_daily_menu_items_menu_recipe",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    daily_menu_id: Mapped[int] = mapped_column(
        ForeignKey("daily_menus.id"),
        index=True,
        nullable=False,
    )
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="planned",
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    menu = relationship("DailyMenu", back_populates="items")
    recipe = relationship("Recipe")
