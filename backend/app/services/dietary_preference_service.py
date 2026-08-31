from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dietary_preference import DietaryPreference
from app.models.recipe import Recipe
from app.schemas.dietary_preference import DietaryPreferenceUpdateRequest


@dataclass(frozen=True)
class RecipePreferenceMatch:
    matched: bool
    reasons: list[str]
    warnings: list[str]


def get_dietary_preference(db: Session, user_id: int) -> DietaryPreference | None:
    statement = select(DietaryPreference).where(DietaryPreference.user_id == user_id)
    return db.execute(statement).scalar_one_or_none()


def upsert_dietary_preference(
    db: Session,
    user_id: int,
    data: DietaryPreferenceUpdateRequest,
) -> DietaryPreference:
    preference = get_dietary_preference(db, user_id)
    if preference is None:
        preference = DietaryPreference(user_id=user_id)
        db.add(preference)

    preference.liked = data.liked
    preference.disliked = data.disliked
    preference.avoid = data.avoid
    db.commit()
    db.refresh(preference)
    return preference


def _recipe_text(recipe: Recipe) -> str:
    parts = [recipe.title, recipe.category, recipe.description, *recipe.tips]
    parts.extend(ingredient.name for ingredient in recipe.ingredients)
    return " ".join(part for part in parts if part).casefold()


def _matching_terms(terms: list[str], searchable_text: str) -> list[str]:
    return [term for term in terms if term.casefold() in searchable_text]


def evaluate_recipe_preference(
    recipe: Recipe,
    preference: DietaryPreference | None,
) -> RecipePreferenceMatch:
    if preference is None:
        return RecipePreferenceMatch(matched=False, reasons=[], warnings=[])

    searchable_text = _recipe_text(recipe)
    liked_terms = _matching_terms(preference.liked or [], searchable_text)
    disliked_terms = _matching_terms(preference.disliked or [], searchable_text)
    avoid_terms = _matching_terms(preference.avoid or [], searchable_text)

    reasons = [f"喜欢：{term}" for term in liked_terms]
    warnings = [f"包含不喜欢：{term}" for term in disliked_terms]
    disliked_keys = {term.casefold() for term in disliked_terms}
    warnings.extend(
        f"可能包含忌口：{term}"
        for term in avoid_terms
        if term.casefold() not in disliked_keys
    )

    return RecipePreferenceMatch(
        matched=bool(liked_terms) and not warnings,
        reasons=reasons,
        warnings=warnings,
    )
