from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.daily_menu import DailyMenu, DailyMenuItem
from app.models.dish_order import DishOrder
from app.models.family import Family
from app.models.recipe import Recipe
from app.schemas.family_stats import (
    FamilyMonthlyStats,
    FamilyStatsOrderer,
    FamilyStatsRecipe,
)


def _month_bounds(today: date | None = None) -> tuple[date, date]:
    current = today or datetime.now().date()
    first_day = date(current.year, current.month, 1)
    if current.month == 12:
        next_month = date(current.year + 1, 1, 1)
    else:
        next_month = date(current.year, current.month + 1, 1)
    return first_day, next_month


def _load_month_menus(
    db: Session,
    family_id: int,
    first_day: date,
    next_month: date,
) -> list[DailyMenu]:
    statement = (
        select(DailyMenu)
        .where(
            DailyMenu.family_id == family_id,
            DailyMenu.menu_date >= first_day,
            DailyMenu.menu_date < next_month,
        )
        .options(selectinload(DailyMenu.items).selectinload(DailyMenuItem.recipe))
        .order_by(DailyMenu.menu_date.asc(), DailyMenu.id.asc())
    )
    return list(db.execute(statement).unique().scalars().all())


def _load_month_orders(
    db: Session,
    family_id: int,
    first_day: date,
    next_month: date,
) -> list[DishOrder]:
    statement = (
        select(DishOrder)
        .where(
            DishOrder.family_id == family_id,
            DishOrder.order_date >= first_day,
            DishOrder.order_date < next_month,
        )
        .options(selectinload(DishOrder.user), selectinload(DishOrder.recipe))
        .order_by(DishOrder.order_date.asc(), DishOrder.id.asc())
    )
    return list(db.execute(statement).unique().scalars().all())


def _unique_recipes(items: list[DailyMenuItem]) -> list[Recipe]:
    recipes: dict[int, Recipe] = {}
    for item in items:
        if item.recipe is not None:
            recipes[item.recipe.id] = item.recipe
    return list(recipes.values())


def build_monthly_family_stats(
    db: Session,
    family: Family,
    today: date | None = None,
) -> FamilyMonthlyStats:
    current = today or datetime.now().date()
    first_day, next_month = _month_bounds(current)
    menus = _load_month_menus(db, family.id, first_day, next_month)
    orders = _load_month_orders(db, family.id, first_day, next_month)

    served_recipes_by_date = {
        menu.menu_date: _unique_recipes(
            [item for item in menu.items if item.status == "served"]
        )
        for menu in menus
    }
    completed_orders_by_date: dict[date, dict[int, Recipe]] = defaultdict(dict)
    for order in orders:
        if order.status == "completed" and order.recipe is not None:
            completed_orders_by_date[order.order_date][order.recipe.id] = order.recipe

    completed_recipes_by_date = {}
    for menu_date, recipes in served_recipes_by_date.items():
        if recipes:
            completed_recipes_by_date[menu_date] = recipes

    for order_date, recipes in completed_orders_by_date.items():
        if order_date not in completed_recipes_by_date:
            completed_recipes_by_date[order_date] = list(recipes.values())

    recipe_counts: Counter[int] = Counter()
    recipe_details = {}
    for recipes in completed_recipes_by_date.values():
        for recipe in recipes:
            recipe_counts[recipe.id] += 1
            recipe_details[recipe.id] = recipe

    orderer_counts: Counter[int] = Counter(
        order.user_id for order in orders if order.status != "rejected"
    )
    orderer_names = {
        order.user_id: order.user.username
        for order in orders
        if order.user is not None
    }

    top_recipes = [
        FamilyStatsRecipe(
            recipe_id=recipe_id,
            title=recipe_details[recipe_id].title,
            category=recipe_details[recipe_id].category,
            image_url=recipe_details[recipe_id].image_url,
            count=count,
        )
        for recipe_id, count in recipe_counts.most_common(5)
    ]
    top_orderers = [
        FamilyStatsOrderer(
            user_id=user_id,
            username=orderer_names.get(user_id, "家庭成员"),
            count=count,
        )
        for user_id, count in orderer_counts.most_common(5)
    ]

    return FamilyMonthlyStats(
        month=f"{current.year:04d}-{current.month:02d}",
        completed_meals=len(completed_recipes_by_date),
        dishes_made=sum(len(recipes) for recipes in completed_recipes_by_date.values()),
        total_orders=sum(orderer_counts.values()),
        top_recipes=top_recipes,
        top_orderers=top_orderers,
    )
