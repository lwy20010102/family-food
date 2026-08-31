from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.weekly_menu import WeeklyMenuItem
from app.services.recipe_service import load_recipe_by_id

MEAL_TYPES = {"breakfast", "lunch", "dinner"}


def current_week_start(value: date | None = None) -> date:
    selected_date = value or datetime.now().date()
    return selected_date - timedelta(days=selected_date.weekday())


def week_dates(week_start: date) -> list[date]:
    return [week_start + timedelta(days=offset) for offset in range(7)]


def _load_item_query():
    return select(WeeklyMenuItem).options(selectinload(WeeklyMenuItem.recipe))


def load_weekly_menu_items(
    db: Session,
    family_id: int,
    week_start: date | None = None,
) -> tuple[date, list[WeeklyMenuItem]]:
    normalized_start = current_week_start(week_start)
    normalized_end = normalized_start + timedelta(days=6)
    statement = (
        _load_item_query()
        .where(
            WeeklyMenuItem.family_id == family_id,
            WeeklyMenuItem.menu_date >= normalized_start,
            WeeklyMenuItem.menu_date <= normalized_end,
        )
        .order_by(WeeklyMenuItem.menu_date.asc(), WeeklyMenuItem.id.asc())
    )
    items = list(db.execute(statement).unique().scalars().all())
    return normalized_start, items


def load_weekly_menu_item_by_id(
    db: Session,
    family_id: int,
    item_id: int,
) -> WeeklyMenuItem | None:
    statement = _load_item_query().where(
        WeeklyMenuItem.family_id == family_id,
        WeeklyMenuItem.id == item_id,
    )
    return db.execute(statement).unique().scalar_one_or_none()


def create_weekly_menu_item(
    db: Session,
    family_id: int,
    menu_date: date,
    meal_type: str,
    recipe_id: int,
    servings: int,
) -> WeeklyMenuItem:
    if meal_type not in MEAL_TYPES:
        raise ValueError("餐次无效")

    recipe = load_recipe_by_id(db, family_id, recipe_id)
    if recipe is None:
        raise ValueError("菜谱不存在或不属于当前空间")

    existing_statement = select(WeeklyMenuItem.id).where(
        WeeklyMenuItem.family_id == family_id,
        WeeklyMenuItem.menu_date == menu_date,
        WeeklyMenuItem.meal_type == meal_type,
        WeeklyMenuItem.recipe_id == recipe_id,
    )
    if db.execute(existing_statement).scalar_one_or_none() is not None:
        raise ValueError("这道菜已经安排在该餐次")

    item = WeeklyMenuItem(
        family_id=family_id,
        menu_date=menu_date,
        meal_type=meal_type,
        recipe_id=recipe.id,
        servings=servings,
    )
    db.add(item)
    db.commit()
    return load_weekly_menu_item_by_id(db, family_id, item.id) or item


def update_weekly_menu_item_servings(
    db: Session,
    item: WeeklyMenuItem,
    servings: int,
) -> WeeklyMenuItem:
    item.servings = servings
    db.commit()
    return load_weekly_menu_item_by_id(db, item.family_id, item.id) or item


def delete_weekly_menu_item(db: Session, item: WeeklyMenuItem) -> None:
    db.delete(item)
    db.commit()
