from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DailyMenuView(Base):
    """Records that a family member has seen a specific published menu."""

    __tablename__ = "daily_menu_views"
    __table_args__ = (
        UniqueConstraint(
            "daily_menu_id",
            "user_id",
            name="uq_daily_menu_views_menu_user",
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
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    menu = relationship("DailyMenu", back_populates="views")
    family = relationship("Family")
    user = relationship("User")
