from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class RecipeImportBackup(Base):
    """Server-side snapshot used to undo one recipe workbook import."""

    __tablename__ = "recipe_import_backups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    family_id: Mapped[int] = mapped_column(
        ForeignKey("families.id"), index=True, nullable=False
    )
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_json: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    created_recipe_ids: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    imported_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_undone: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    undone_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

