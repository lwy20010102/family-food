from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.weekly_menu import (
    WeeklyMenuDayPublic,
    WeeklyMenuItemCreateRequest,
    WeeklyMenuItemPublic,
    WeeklyMenuItemResponse,
    WeeklyMenuItemServingsUpdateRequest,
    WeeklyMenuWeekResponse,
)
from app.services.family_service import get_user_workspace
from app.services.weekly_menu_service import (
    create_weekly_menu_item,
    delete_weekly_menu_item,
    load_weekly_menu_item_by_id,
    load_weekly_menu_items,
    update_weekly_menu_item_servings,
    week_dates,
)

router = APIRouter(prefix="/weekly-menus", tags=["weekly-menus"])


def _get_family_id(db: Session, current_user: User) -> int:
    return get_user_workspace(db, current_user.id).id


def _serialize_week(
    week_start: date,
    items: list,
) -> WeeklyMenuWeekResponse:
    items_by_date: dict[date, list] = {menu_date: [] for menu_date in week_dates(week_start)}
    for item in items:
        if item.menu_date in items_by_date:
            items_by_date[item.menu_date].append(item)

    return WeeklyMenuWeekResponse(
        week_start=week_start,
        week_end=week_start + timedelta(days=6),
        days=[
            WeeklyMenuDayPublic(
                menu_date=menu_date,
                items=[WeeklyMenuItemPublic.model_validate(item) for item in items_by_date[menu_date]],
            )
            for menu_date in week_dates(week_start)
        ],
    )


@router.get("", response_model=WeeklyMenuWeekResponse)
def get_weekly_menu(
    week_start: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WeeklyMenuWeekResponse:
    family_id = _get_family_id(db, current_user)
    normalized_start, items = load_weekly_menu_items(db, family_id, week_start)
    return _serialize_week(normalized_start, items)


@router.post("/items", response_model=WeeklyMenuItemResponse, status_code=status.HTTP_201_CREATED)
def add_weekly_menu_item(
    payload: WeeklyMenuItemCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WeeklyMenuItemResponse:
    family_id = _get_family_id(db, current_user)
    try:
        item = create_weekly_menu_item(
            db,
            family_id,
            payload.menu_date,
            payload.meal_type,
            payload.recipe_id,
            payload.servings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return WeeklyMenuItemResponse(item=WeeklyMenuItemPublic.model_validate(item))


@router.patch("/items/{item_id}", response_model=WeeklyMenuItemResponse)
def change_weekly_menu_item_servings(
    item_id: int,
    payload: WeeklyMenuItemServingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WeeklyMenuItemResponse:
    family_id = _get_family_id(db, current_user)
    item = load_weekly_menu_item_by_id(db, family_id, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="周菜单项目不存在")

    item = update_weekly_menu_item_servings(db, item, payload.servings)
    return WeeklyMenuItemResponse(item=WeeklyMenuItemPublic.model_validate(item))


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_weekly_menu_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    family_id = _get_family_id(db, current_user)
    item = load_weekly_menu_item_by_id(db, family_id, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="周菜单项目不存在")

    delete_weekly_menu_item(db, item)
