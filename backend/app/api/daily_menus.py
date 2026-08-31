from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.family import Family
from app.models.user import User
from app.schemas.daily_menu import (
    DailyMenuConfirmRequest,
    DailyMenuItemResponse,
    DailyMenuItemStatusUpdateRequest,
    DailyMenuPublic,
    DailyMenuResponse,
    DailyMenuTodayResponse,
)
from app.schemas.dish_order import DishOrderPublic
from app.services.daily_menu_service import (
    confirm_today_menu,
    load_today_menu,
    load_today_menu_item_by_id,
    update_daily_menu_item_status,
)
from app.services.dish_order_service import load_today_dish_orders
from app.services.family_service import get_user_workspace

router = APIRouter(prefix="/daily-menus", tags=["daily-menus"])


def _get_family(db: Session, current_user: User) -> Family:
    return get_user_workspace(db, current_user.id)


@router.get("/today", response_model=DailyMenuTodayResponse)
def get_today_menu(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuTodayResponse:
    family = _get_family(db, current_user)
    menu = load_today_menu(db, family.id)
    orders = load_today_dish_orders(db, family.id)
    return DailyMenuTodayResponse(
        menu=DailyMenuPublic.model_validate(menu) if menu else None,
        orders=[DishOrderPublic.model_validate(order) for order in orders],
    )


@router.put("/today", response_model=DailyMenuResponse)
def save_today_menu(
    payload: DailyMenuConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuResponse:
    family = _get_family(db, current_user)
    try:
        menu = confirm_today_menu(db, family, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return DailyMenuResponse(menu=DailyMenuPublic.model_validate(menu))


@router.patch("/today/items/{item_id}/status", response_model=DailyMenuItemResponse)
def change_today_menu_item_status(
    item_id: int,
    payload: DailyMenuItemStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuItemResponse:
    family = _get_family(db, current_user)
    if current_user.id != family.creator_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有家庭创建者可以调整菜品状态",
        )

    item = load_today_menu_item_by_id(db, family.id, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="菜品不存在",
        )

    try:
        updated = update_daily_menu_item_status(db, family.id, item, payload.status)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return DailyMenuItemResponse(item=updated)
