from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.daily_menu import DailyMenu, DailyMenuItem
from app.models.family import Family
from app.models.user import User
from app.schemas.daily_menu import DailyMenuConfirmRequest, DailyMenuItemStatus
from app.services.dish_order_service import load_today_dish_orders
from app.services.notification_service import create_family_notifications
from app.services.shopping_list_service import rebuild_today_shopping_list
from app.services.recipe_service import load_recipe_by_id

ALLOWED_DAILY_MENU_ITEM_STATUSES = {
    "planned",
    "cooking",
    "served",
    "cancelled",
}


def _today() -> date:
    return datetime.now().date()


def _load_menu_query():
    return select(DailyMenu).options(
        selectinload(DailyMenu.confirmed_by),
        selectinload(DailyMenu.items).selectinload(DailyMenuItem.recipe),
    )


def load_today_menu(db: Session, family_id: int) -> DailyMenu | None:
    statement = _load_menu_query().where(
        DailyMenu.family_id == family_id,
        DailyMenu.menu_date == _today(),
    )
    return db.execute(statement).unique().scalar_one_or_none()


def load_today_menu_item_by_id(
    db: Session,
    family_id: int,
    item_id: int,
) -> DailyMenuItem | None:
    statement = (
        select(DailyMenuItem)
        .join(DailyMenu)
        .options(selectinload(DailyMenuItem.recipe))
        .where(
            DailyMenu.family_id == family_id,
            DailyMenu.menu_date == _today(),
            DailyMenuItem.id == item_id,
        )
    )
    return db.execute(statement).unique().scalar_one_or_none()


def confirm_today_menu(
    db: Session,
    family: Family,
    user: User,
    payload: DailyMenuConfirmRequest,
) -> DailyMenu:
    if user.id != family.creator_id:
        raise ValueError("只有家庭创建者可以确认最终菜单")

    orders = load_today_dish_orders(db, family.id)
    if not orders:
        raise ValueError("今天还没有点菜，不能确认最终菜单")

    available_recipe_ids = {order.recipe_id for order in orders}
    recipe_ids = list(dict.fromkeys(payload.recipe_ids))

    if not recipe_ids:
        raise ValueError("请先选择要做的菜")

    missing_recipe_ids = [recipe_id for recipe_id in recipe_ids if recipe_id not in available_recipe_ids]
    if missing_recipe_ids:
        raise ValueError("所选菜品里有不在今日点菜中的项目")

    menu = load_today_menu(db, family.id)
    if menu is None:
        menu = DailyMenu(
            family_id=family.id,
            menu_date=_today(),
        )
        db.add(menu)
    else:
        menu.items.clear()

    db.flush()

    menu.status = "confirmed"
    menu.servings = payload.servings
    menu.confirmed_by_id = user.id
    menu.confirmed_by = user
    menu.confirmed_at = datetime.now()
    menu.menu_date = _today()

    recipe_titles: list[str] = []
    for sort_order, recipe_id in enumerate(recipe_ids):
        recipe = load_recipe_by_id(db, family.id, recipe_id)
        if recipe is None:
            raise ValueError("菜谱不存在或不属于当前空间")

        recipe_titles.append(recipe.title)
        menu.items.append(
            DailyMenuItem(
                recipe_id=recipe.id,
                status="planned",
                sort_order=sort_order,
            )
        )

    menu_title = "、".join(recipe_titles)
    create_family_notifications(
        db,
        family,
        user,
        type="daily_menu_confirmed",
        title="今日菜单已确认",
        content=f"{user.username} 确认了今天的菜单：{menu_title}",
        related_id=menu.id,
        link_url="/menu",
    )

    rebuild_today_shopping_list(db, family, menu)
    db.commit()
    return load_today_menu(db, family.id) or menu


def update_daily_menu_item_status(
    db: Session,
    family_id: int,
    item: DailyMenuItem,
    status: DailyMenuItemStatus,
) -> DailyMenuItem:
    if status not in ALLOWED_DAILY_MENU_ITEM_STATUSES:
        raise ValueError("菜品状态无效")

    item.status = status
    db.commit()
    return load_today_menu_item_by_id(db, family_id, item.id) or item
