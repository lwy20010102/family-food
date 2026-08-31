from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.dish_order import (
    DishOrderCreateRequest,
    DishOrderResponse,
    DishOrderStatusUpdateRequest,
    DishOrdersResponse,
)
from app.services.dish_order_service import (
    load_dish_order_by_id,
    load_today_dish_orders,
    submit_dish_orders,
    update_dish_order_status,
)
from app.services.family_service import get_user_workspace

router = APIRouter(prefix="/dish-orders", tags=["dish-orders"])


def _get_family(db: Session, current_user: User):
    return get_user_workspace(db, current_user.id)


@router.get("/today", response_model=DishOrdersResponse)
def get_today_dish_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DishOrdersResponse:
    family = _get_family(db, current_user)
    orders = load_today_dish_orders(db, family.id)
    return DishOrdersResponse(orders=[order for order in orders])


@router.post("", response_model=DishOrdersResponse, status_code=status.HTTP_201_CREATED)
def create_dish_orders(
    payload: DishOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DishOrdersResponse:
    family = _get_family(db, current_user)
    try:
        orders = submit_dish_orders(db, family, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return DishOrdersResponse(orders=orders)


@router.patch("/{order_id}/status", response_model=DishOrderResponse)
def change_dish_order_status(
    order_id: int,
    payload: DishOrderStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DishOrderResponse:
    family = _get_family(db, current_user)
    order = load_dish_order_by_id(db, family.id, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="点菜记录不存在",
        )

    if current_user.id not in (order.user_id, family.creator_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限修改这条点菜记录",
        )

    try:
        updated = update_dish_order_status(db, order, payload.status)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return DishOrderResponse(order=updated)
