from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ShoppingList(Base):
    __tablename__ = "shopping_lists"
    __table_args__ = (
        UniqueConstraint(
            "family_id",
            "menu_date",
            name="uq_shopping_lists_family_menu_date",
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    family = relationship("Family")
    items = relationship(
        "ShoppingListItem",
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        order_by="ShoppingListItem.id",
    )


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    shopping_list_id: Mapped[int] = mapped_column(
        ForeignKey("shopping_lists.id"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    is_purchased: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    shopping_list = relationship("ShoppingList", back_populates="items")
