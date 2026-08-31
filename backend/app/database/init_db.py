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

    Base.metadata.create_all(bind=get_engine())
