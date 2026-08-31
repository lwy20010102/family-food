from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.recipe import Recipe
from app.models.user import User
from app.schemas.recipe import (
    RecipeCreateRequest,
    RecipeDeleteResponse,
    RecipeDetail,
    RecipeFavoriteResponse,
    RecipeHistoryItem,
    RecipeHistoryResponse,
    RecipeResponse,
    RecipeSummary,
    RecipesResponse,
    RecipeUpdateRequest,
)
from app.services.family_service import get_user_workspace
from app.services.dietary_preference_service import (
    RecipePreferenceMatch,
    evaluate_recipe_preference,
    get_dietary_preference,
)
from app.services.recipe_service import (
    create_recipe,
    delete_recipe,
    get_recipe_favorite_ids,
    is_recipe_favorite,
    list_favorite_recipes,
    list_recipe_view_history,
    list_recipes,
    load_recipe_by_id,
    record_recipe_view,
    set_recipe_favorite,
    update_recipe,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _get_family_id(db: Session, current_user: User) -> int:
    return get_user_workspace(db, current_user.id).id


def _get_recipe_or_404(db: Session, family_id: int, recipe_id: int) -> Recipe:
    recipe = load_recipe_by_id(db, family_id, recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜谱不存在",
        )
    return recipe


def _serialize_recipe_summary(
    recipe: Recipe,
    is_favorite: bool = False,
    preference_match: RecipePreferenceMatch | None = None,
) -> RecipeSummary:
    match = preference_match or RecipePreferenceMatch(False, [], [])
    return RecipeSummary.model_validate(recipe).model_copy(
        update={
            "is_favorite": is_favorite,
            "preference_match": match.matched,
            "preference_reasons": match.reasons,
            "preference_warnings": match.warnings,
        },
    )


def _serialize_recipe_detail(
    recipe: Recipe,
    is_favorite: bool = False,
    preference_match: RecipePreferenceMatch | None = None,
) -> RecipeDetail:
    return RecipeDetail.model_validate(recipe).model_copy(
        update={
            "is_favorite": is_favorite,
            "preference_match": (
                preference_match.matched if preference_match else False
            ),
            "preference_reasons": preference_match.reasons if preference_match else [],
            "preference_warnings": preference_match.warnings if preference_match else [],
        },
    )


@router.get("", response_model=RecipesResponse)
def get_recipes(
    q: str | None = None,
    category: str | None = None,
    preference: Literal["all", "match", "warning"] = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipesResponse:
    family_id = _get_family_id(db, current_user)
    recipes = list_recipes(db, family_id, query=q, category=category)
    dietary_preference = get_dietary_preference(db, current_user.id)
    favorite_ids = get_recipe_favorite_ids(
        db,
        current_user.id,
        {recipe.id for recipe in recipes},
    )
    serialized_recipes: list[RecipeSummary] = []
    for recipe in recipes:
        preference_match = evaluate_recipe_preference(recipe, dietary_preference)
        if preference == "match" and not preference_match.matched:
            continue
        if preference == "warning" and not preference_match.warnings:
            continue
        serialized_recipes.append(
            _serialize_recipe_summary(
                recipe,
                recipe.id in favorite_ids,
                preference_match,
            )
        )

    return RecipesResponse(recipes=serialized_recipes)


@router.get("/favorites", response_model=RecipesResponse)
def get_favorite_recipes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipesResponse:
    family_id = _get_family_id(db, current_user)
    recipes = list_favorite_recipes(db, current_user.id, family_id)
    dietary_preference = get_dietary_preference(db, current_user.id)
    return RecipesResponse(
        recipes=[
            _serialize_recipe_summary(
                recipe,
                True,
                evaluate_recipe_preference(recipe, dietary_preference),
            )
            for recipe in recipes
        ],
    )


@router.get("/history", response_model=RecipeHistoryResponse)
def get_recipe_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeHistoryResponse:
    family_id = _get_family_id(db, current_user)
    history = list_recipe_view_history(db, current_user.id, family_id)
    dietary_preference = get_dietary_preference(db, current_user.id)
    favorite_ids = get_recipe_favorite_ids(
        db,
        current_user.id,
        {item.recipe_id for item in history},
    )
    return RecipeHistoryResponse(
        items=[
            RecipeHistoryItem(
                recipe=_serialize_recipe_summary(
                    item.recipe,
                    item.recipe_id in favorite_ids,
                    evaluate_recipe_preference(item.recipe, dietary_preference),
                ),
                viewed_at=item.viewed_at,
            )
            for item in history
        ],
    )


@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def add_recipe(
    payload: RecipeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    family_id = _get_family_id(db, current_user)
    recipe = create_recipe(db, family_id, current_user.id, payload)
    return RecipeResponse(
        recipe=_serialize_recipe_detail(
            recipe,
            preference_match=evaluate_recipe_preference(
                recipe,
                get_dietary_preference(db, current_user.id),
            ),
        )
    )


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    family_id = _get_family_id(db, current_user)
    recipe = _get_recipe_or_404(db, family_id, recipe_id)
    record_recipe_view(db, current_user.id, recipe.id)
    dietary_preference = get_dietary_preference(db, current_user.id)
    return RecipeResponse(
        recipe=_serialize_recipe_detail(
            recipe,
            is_recipe_favorite(db, current_user.id, recipe.id),
            evaluate_recipe_preference(recipe, dietary_preference),
        ),
    )


@router.put("/{recipe_id}/favorite", response_model=RecipeFavoriteResponse)
def add_recipe_favorite(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeFavoriteResponse:
    family_id = _get_family_id(db, current_user)
    recipe = _get_recipe_or_404(db, family_id, recipe_id)
    set_recipe_favorite(db, current_user.id, recipe.id, True)
    return RecipeFavoriteResponse(recipe_id=recipe.id, is_favorite=True)


@router.delete("/{recipe_id}/favorite", response_model=RecipeFavoriteResponse)
def remove_recipe_favorite(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeFavoriteResponse:
    family_id = _get_family_id(db, current_user)
    recipe = _get_recipe_or_404(db, family_id, recipe_id)
    set_recipe_favorite(db, current_user.id, recipe.id, False)
    return RecipeFavoriteResponse(recipe_id=recipe.id, is_favorite=False)


@router.put("/{recipe_id}", response_model=RecipeResponse)
def edit_recipe(
    recipe_id: int,
    payload: RecipeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    family_id = _get_family_id(db, current_user)
    recipe = _get_recipe_or_404(db, family_id, recipe_id)
    recipe = update_recipe(db, recipe, payload)
    dietary_preference = get_dietary_preference(db, current_user.id)
    return RecipeResponse(
        recipe=_serialize_recipe_detail(
            recipe,
            is_recipe_favorite(db, current_user.id, recipe.id),
            evaluate_recipe_preference(recipe, dietary_preference),
        ),
    )


@router.delete("/{recipe_id}", response_model=RecipeDeleteResponse)
def remove_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeDeleteResponse:
    family_id = _get_family_id(db, current_user)
    recipe = _get_recipe_or_404(db, family_id, recipe_id)
    delete_recipe(db, recipe)
    return RecipeDeleteResponse(message="菜谱已删除")
