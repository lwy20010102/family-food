from sqlalchemy import inspect, text

from app.database.base import Base
from app.database.session import get_engine


def init_db() -> None:
    from app.models import (  # noqa: F401
        DailyMenu,
        DailyMenuItem,
        DietaryPreference,
        DishOrder,
        Family,
        FamilyMember,
        Notification,
        Recipe,
        RecipeFavorite,
        RecipeIngredient,
        RecipeStep,
        RecipeViewHistory,
        ShoppingList,
        ShoppingListItem,
        User,
        WeeklyMenuItem,
    )

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    _ensure_recipe_import_columns(engine)


def _ensure_recipe_import_columns(engine) -> None:
    """Add optional Excel identity and source fields to older databases."""
    inspector = inspect(engine)
    if "recipes" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("recipes")}
    with engine.begin() as connection:
        if "recipe_key" not in columns:
            connection.execute(text("ALTER TABLE recipes ADD COLUMN recipe_key VARCHAR(50)"))
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_recipes_recipe_key "
                    "ON recipes (recipe_key)"
                )
            )
        if "source_url" not in columns:
            connection.execute(text("ALTER TABLE recipes ADD COLUMN source_url VARCHAR(500)"))
