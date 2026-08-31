from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.dish_order import DishOrder
from app.models.family import Family
from app.models.user import User
from app.schemas.dish_order import DishOrderCreateRequest, DishOrderStatus
from app.services.notification_service import create_family_notifications
from app.services.recipe_service import load_recipe_by_id

ALLOWED_ORDER_STATUSES = {
    "pending",
    "viewed",
    "confirmed",
    "rejected",
    "completed",
}


def _today() -> date:
    return datetime.now().date()


def _load_order_query():
    return select(DishOrder).options(
        selectinload(DishOrder.user),
        selectinload(DishOrder.recipe),
    )


def load_today_dish_orders(db: Session, family_id: int) -> list[DishOrder]:
    statement = (
        _load_order_query()
        .where(
            DishOrder.family_id == family_id,
            DishOrder.order_date == _today(),
        )
        .order_by(DishOrder.created_at.asc(), DishOrder.id.asc())
    )
    return list(db.execute(statement).unique().scalars().all())


def load_dish_order_by_id(
    db: Session,
    family_id: int,
    order_id: int,
) -> DishOrder | None:
    statement = _load_order_query().where(
        DishOrder.family_id == family_id,
        DishOrder.id == order_id,
    )
    return db.execute(statement).unique().scalar_one_or_none()


def submit_dish_orders(
    db: Session,
    family: Family,
    user: User,
    payload: DishOrderCreateRequest,
) -> list[DishOrder]:
    recipe_ids: list[int] = list(dict.fromkeys(payload.recipe_ids))
    if not recipe_ids:
        return []

    recipes: list[Recipe] = []
    for recipe_id in recipe_ids:
        recipe = load_recipe_by_id(db, family.id, recipe_id)
        if recipe is None:
            raise ValueError("菜谱不存在或不属于当前空间")
        recipes.append(recipe)

    for recipe in recipes:
        statement = select(DishOrder).where(
            DishOrder.family_id == family.id,
            DishOrder.user_id == user.id,
            DishOrder.recipe_id == recipe.id,
            DishOrder.order_date == _today(),
        )
        existing = db.execute(statement).scalar_one_or_none()
        if existing is None:
            db.add(
                DishOrder(
                    family_id=family.id,
                    user_id=user.id,
                    recipe_id=recipe.id,
                    order_date=_today(),
                    status="pending",
                )
            )
        else:
            existing.status = "pending"

    recipe_titles = "、".join(recipe.title for recipe in recipes)
    create_family_notifications(
        db,
        family,
        user,
        type="dish_orders_created",
        title="新的点菜通知",
        content=f"{user.username} 点了：{recipe_titles}",
        link_url="/orders",
    )

    db.commit()
    return load_today_dish_orders(db, family.id)


def update_dish_order_status(
    db: Session,
    order: DishOrder,
    status: DishOrderStatus,
) -> DishOrder:
    if status not in ALLOWED_ORDER_STATUSES:
        raise ValueError("点菜状态无效")

    order.status = status
    db.commit()
    return load_dish_order_by_id(db, order.family_id, order.id) or order
