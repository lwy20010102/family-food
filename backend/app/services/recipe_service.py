from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.recipe import Recipe, RecipeIngredient, RecipeStep
from app.models.recipe_activity import RecipeFavorite, RecipeViewHistory
from app.schemas.recipe import RecipeCreateRequest, RecipeUpdateRequest


def _load_recipe_query():
    return (
        select(Recipe)
        .options(
            selectinload(Recipe.creator),
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
        )
    )


def load_recipe_by_id(db: Session, family_id: int, recipe_id: int) -> Recipe | None:
    statement = _load_recipe_query().where(
        Recipe.family_id == family_id,
        Recipe.id == recipe_id,
    )
    return db.execute(statement).unique().scalar_one_or_none()


def list_recipes(
    db: Session,
    family_id: int,
    query: str | None = None,
    category: str | None = None,
) -> list[Recipe]:
    statement = _load_recipe_query().where(Recipe.family_id == family_id)

    if query:
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(
                Recipe.title.ilike(pattern),
                Recipe.description.ilike(pattern),
                Recipe.ingredients.any(RecipeIngredient.name.ilike(pattern)),
            )
        )

    if category:
        statement = statement.where(Recipe.category == category.strip())

    statement = statement.order_by(Recipe.updated_at.desc(), Recipe.created_at.desc())
    return list(db.execute(statement).unique().scalars().all())


def get_recipe_favorite_ids(
    db: Session,
    user_id: int,
    recipe_ids: set[int] | None = None,
) -> set[int]:
    statement = select(RecipeFavorite.recipe_id).where(
        RecipeFavorite.user_id == user_id,
    )
    if recipe_ids is not None:
        if not recipe_ids:
            return set()
        statement = statement.where(RecipeFavorite.recipe_id.in_(recipe_ids))

    return set(db.execute(statement).scalars().all())


def list_favorite_recipes(
    db: Session,
    user_id: int,
    family_id: int,
) -> list[Recipe]:
    statement = (
        _load_recipe_query()
        .join(RecipeFavorite, RecipeFavorite.recipe_id == Recipe.id)
        .where(
            RecipeFavorite.user_id == user_id,
            Recipe.family_id == family_id,
        )
        .order_by(RecipeFavorite.created_at.desc())
    )
    return list(db.execute(statement).unique().scalars().all())


def list_recipe_view_history(
    db: Session,
    user_id: int,
    family_id: int,
    limit: int = 50,
) -> list[RecipeViewHistory]:
    statement = (
        select(RecipeViewHistory)
        .join(Recipe, RecipeViewHistory.recipe_id == Recipe.id)
        .where(
            RecipeViewHistory.user_id == user_id,
            Recipe.family_id == family_id,
        )
        .options(
            selectinload(RecipeViewHistory.recipe).selectinload(Recipe.creator),
            selectinload(RecipeViewHistory.recipe).selectinload(Recipe.ingredients),
            selectinload(RecipeViewHistory.recipe).selectinload(Recipe.steps),
        )
        .order_by(RecipeViewHistory.viewed_at.desc())
        .limit(limit)
    )
    return list(db.execute(statement).unique().scalars().all())


def is_recipe_favorite(db: Session, user_id: int, recipe_id: int) -> bool:
    statement = select(RecipeFavorite.id).where(
        RecipeFavorite.user_id == user_id,
        RecipeFavorite.recipe_id == recipe_id,
    )
    return db.execute(statement).scalar_one_or_none() is not None


def set_recipe_favorite(
    db: Session,
    user_id: int,
    recipe_id: int,
    is_favorite: bool,
) -> bool:
    statement = select(RecipeFavorite).where(
        RecipeFavorite.user_id == user_id,
        RecipeFavorite.recipe_id == recipe_id,
    )
    favorite = db.execute(statement).scalar_one_or_none()

    if is_favorite and favorite is None:
        db.add(RecipeFavorite(user_id=user_id, recipe_id=recipe_id))
    elif not is_favorite and favorite is not None:
        db.delete(favorite)

    db.commit()
    return is_favorite


def record_recipe_view(db: Session, user_id: int, recipe_id: int) -> None:
    statement = select(RecipeViewHistory).where(
        RecipeViewHistory.user_id == user_id,
        RecipeViewHistory.recipe_id == recipe_id,
    )
    history = db.execute(statement).scalar_one_or_none()

    if history is None:
        db.add(RecipeViewHistory(user_id=user_id, recipe_id=recipe_id))
    else:
        history.viewed_at = datetime.now()

    db.commit()


def _apply_recipe_fields(recipe: Recipe, data: RecipeCreateRequest | RecipeUpdateRequest) -> None:
    recipe.title = data.title.strip()
    recipe.description = data.description.strip()
    recipe.category = data.category
    recipe.image_url = data.image_url.strip() if data.image_url else None
    recipe.default_servings = data.default_servings
    recipe.cooking_time = data.cooking_time
    recipe.difficulty = data.difficulty
    recipe.tips = [tip.strip() for tip in data.tips if tip.strip()]
    recipe.source_type = data.source_type


def _replace_ingredients(recipe: Recipe, data: RecipeCreateRequest | RecipeUpdateRequest) -> None:
    recipe.ingredients = [
        RecipeIngredient(
            name=item.name.strip(),
            amount=item.amount.strip(),
            unit=item.unit.strip(),
            type=item.type,
            sort_order=index,
        )
        for index, item in enumerate(data.ingredients)
    ]


def _replace_steps(recipe: Recipe, data: RecipeCreateRequest | RecipeUpdateRequest) -> None:
    recipe.steps = [
        RecipeStep(
            step_number=item.step_number,
            description=item.description.strip(),
            duration=item.duration.strip() if item.duration else None,
        )
        for item in data.steps
    ]


def create_recipe(
    db: Session,
    family_id: int,
    creator_id: int,
    data: RecipeCreateRequest,
) -> Recipe:
    recipe = Recipe(
        family_id=family_id,
        creator_id=creator_id,
    )
    _apply_recipe_fields(recipe, data)
    _replace_ingredients(recipe, data)
    _replace_steps(recipe, data)
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return load_recipe_by_id(db, family_id, recipe.id) or recipe


def update_recipe(
    db: Session,
    recipe: Recipe,
    data: RecipeUpdateRequest,
) -> Recipe:
    _apply_recipe_fields(recipe, data)
    _replace_ingredients(recipe, data)
    _replace_steps(recipe, data)
    db.commit()
    db.refresh(recipe)
    return load_recipe_by_id(db, recipe.family_id, recipe.id) or recipe


def delete_recipe(db: Session, recipe: Recipe) -> None:
    db.delete(recipe)
    db.commit()
