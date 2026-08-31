from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DishOrder(Base):
    __tablename__ = "dish_orders"

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
    order_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
        default=date.today,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    family = relationship("Family")
    user = relationship("User")
    recipe = relationship("Recipe", back_populates="dish_orders")
