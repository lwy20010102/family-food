from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.family import Family
from app.models.user import User
from app.schemas.daily_menu import DailyMenuPublic
from app.schemas.shopping_list import (
    ShoppingListItemPublic,
    ShoppingListItemResponse,
    ShoppingListItemUpdateRequest,
    ShoppingListPublic,
    ShoppingListResetResponse,
    ShoppingListTodayResponse,
)
from app.services.daily_menu_service import load_today_menu
from app.services.family_service import get_user_workspace
from app.services.shopping_list_service import (
    load_shopping_list_item_by_id,
    load_today_shopping_list,
    rebuild_today_shopping_list,
    reset_today_shopping_list,
    set_shopping_list_item_purchase_state,
)

router = APIRouter(prefix="/shopping-lists", tags=["shopping-lists"])


def _get_family(db: Session, current_user: User) -> Family:
    return get_user_workspace(db, current_user.id)


def _serialize_shopping_list(shopping_list) -> ShoppingListPublic | None:
    if shopping_list is None:
        return None

    return ShoppingListPublic.model_validate(shopping_list)


@router.get("/today", response_model=ShoppingListTodayResponse)
def get_today_shopping_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ShoppingListTodayResponse:
    family = _get_family(db, current_user)
    menu = load_today_menu(db, family.id)
    shopping_list = load_today_shopping_list(db, family.id)

    if menu is not None and menu.status == "confirmed" and shopping_list is None:
        shopping_list = rebuild_today_shopping_list(db, family, menu)

    return ShoppingListTodayResponse(
        shopping_list=_serialize_shopping_list(shopping_list),
        menu=DailyMenuPublic.model_validate(menu) if menu else None,
    )


@router.patch("/today/items/{item_id}", response_model=ShoppingListItemResponse)
def update_today_shopping_list_item(
    item_id: int,
    payload: ShoppingListItemUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ShoppingListItemResponse:
    family = _get_family(db, current_user)
    shopping_list = load_today_shopping_list(db, family.id)
    if shopping_list is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="今日采购清单不存在",
        )

    item = load_shopping_list_item_by_id(db, family.id, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="采购清单项不存在",
        )

    updated = set_shopping_list_item_purchase_state(db, item, payload.is_purchased)
    return ShoppingListItemResponse(
        item=ShoppingListItemPublic.model_validate(updated),
    )


@router.patch("/today/reset", response_model=ShoppingListResetResponse)
def reset_today_shopping_list_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ShoppingListResetResponse:
    family = _get_family(db, current_user)
    shopping_list = reset_today_shopping_list(db, family.id)
    return ShoppingListResetResponse(
        shopping_list=_serialize_shopping_list(shopping_list),
    )
