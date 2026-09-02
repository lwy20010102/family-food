from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.family import Family
from app.models.user import User
from app.schemas.daily_menu import (
    DailyMenuConfirmRequest,
    DailyMenuFeedbackPublic,
    DailyMenuFeedbackRequest,
    DailyMenuFeedbackResponse,
    DailyMenuItemResponse,
    DailyMenuItemStatusUpdateRequest,
    DailyMenuPublic,
    DailyMenuResponse,
    DailyMenuTodayResponse,
    DailyMenuViewPublic,
    DailyMenuViewRequest,
    DailyMenuViewResponse,
    DailyMenuVersionPublic,
)
from app.schemas.dish_order import DishOrderPublic
from app.services.daily_menu_service import (
    confirm_today_menu,
    load_today_menu,
    load_today_menu_feedbacks,
    load_today_menu_item_by_id,
    load_today_menu_views,
    load_today_menu_versions,
    publish_today_menu,
    save_today_menu_feedback,
    save_today_menu_view,
    restore_today_menu_version,
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
    feedbacks = load_today_menu_feedbacks(db, family.id)
    menu_views = load_today_menu_views(db, family.id)
    # Version history is an owner recovery tool; regular members only need
    # the currently published menu and its shared status.
    menu_versions = (
        load_today_menu_versions(db, family.id)
        if current_user.id == family.creator_id
        else []
    )
    return DailyMenuTodayResponse(
        menu=DailyMenuPublic.model_validate(menu) if menu else None,
        orders=[DishOrderPublic.model_validate(order) for order in orders],
        feedbacks=[
            DailyMenuFeedbackPublic.model_validate(feedback)
            for feedback in feedbacks
        ],
        menu_views=[
            DailyMenuViewPublic.model_validate(view)
            for view in menu_views
        ],
        menu_versions=[
            DailyMenuVersionPublic.model_validate(version)
            for version in menu_versions
        ],
    )


@router.put("/today/feedback", response_model=DailyMenuFeedbackResponse)
def save_today_feedback(
    payload: DailyMenuFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuFeedbackResponse:
    family = _get_family(db, current_user)
    try:
        feedback = save_today_menu_feedback(
            db,
            family,
            current_user,
            payload.recipe_id,
            payload.preference,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return DailyMenuFeedbackResponse(
        feedback=(
            DailyMenuFeedbackPublic.model_validate(feedback)
            if feedback
            else None
        ),
    )


@router.put("/today/view", response_model=DailyMenuViewResponse)
def save_today_view(
    payload: DailyMenuViewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuViewResponse:
    family = _get_family(db, current_user)
    try:
        view = save_today_menu_view(db, family, current_user, payload.viewed)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return DailyMenuViewResponse(
        view=DailyMenuViewPublic.model_validate(view) if view else None,
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


@router.post("/today/publish", response_model=DailyMenuResponse)
def publish_today_menu_endpoint(
    payload: DailyMenuConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuResponse:
    """Publish directly from the recipe library without creating fake orders."""
    family = _get_family(db, current_user)
    try:
        menu = publish_today_menu(db, family, current_user, payload)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="发布今晚菜单失败，数据没有被修改",
        ) from exc

    return DailyMenuResponse(menu=DailyMenuPublic.model_validate(menu))


@router.post("/today/versions/{version_id}/restore", response_model=DailyMenuResponse)
def restore_today_menu_version_endpoint(
    version_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyMenuResponse:
    family = _get_family(db, current_user)
    try:
        menu = restore_today_menu_version(db, family, current_user, version_id)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="恢复菜单版本失败，数据没有被修改") from exc

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
