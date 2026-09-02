from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.daily_menu import DailyMenu, DailyMenuItem
from app.models.daily_menu_feedback import DailyMenuFeedback
from app.models.daily_menu_view import DailyMenuView
from app.models.daily_menu_version import DailyMenuVersion
from app.models.family import Family
from app.models.user import User
from app.schemas.daily_menu import (
    DailyMenuConfirmRequest,
    DailyMenuFeedbackChoice,
    DailyMenuItemStatus,
)
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


def load_today_menu_feedbacks(
    db: Session,
    family_id: int,
) -> list[DailyMenuFeedback]:
    statement = (
        select(DailyMenuFeedback)
        .options(selectinload(DailyMenuFeedback.user))
        .where(
            DailyMenuFeedback.family_id == family_id,
            DailyMenuFeedback.feedback_date == _today(),
        )
        .order_by(DailyMenuFeedback.created_at.asc(), DailyMenuFeedback.id.asc())
    )
    return list(db.execute(statement).unique().scalars().all())


def save_today_menu_feedback(
    db: Session,
    family: Family,
    user: User,
    recipe_id: int,
    preference: DailyMenuFeedbackChoice,
) -> DailyMenuFeedback | None:
    """Create, update, or clear one member's preference for a candidate dish."""
    menu = load_today_menu(db, family.id)
    allowed_recipe_ids = {item.recipe_id for item in menu.items} if menu else set()
    allowed_recipe_ids.update(
        order.recipe_id for order in load_today_dish_orders(db, family.id)
    )
    if recipe_id not in allowed_recipe_ids:
        raise ValueError("只能评价今天候选或已发布的菜品")

    statement = select(DailyMenuFeedback).where(
        DailyMenuFeedback.family_id == family.id,
        DailyMenuFeedback.user_id == user.id,
        DailyMenuFeedback.recipe_id == recipe_id,
        DailyMenuFeedback.feedback_date == _today(),
    )
    existing = db.execute(statement).scalar_one_or_none()

    if preference == "none":
        if existing is not None:
            db.delete(existing)
        db.commit()
        return None

    if preference not in {"want", "avoid"}:
        raise ValueError("反馈选项无效")

    if existing is None:
        existing = DailyMenuFeedback(
            family_id=family.id,
            user_id=user.id,
            recipe_id=recipe_id,
            feedback_date=_today(),
            preference=preference,
        )
        db.add(existing)
    else:
        existing.preference = preference

    db.commit()
    return load_today_menu_feedback_by_id(db, family.id, existing.id)


def load_today_menu_feedback_by_id(
    db: Session,
    family_id: int,
    feedback_id: int,
) -> DailyMenuFeedback | None:
    statement = (
        select(DailyMenuFeedback)
        .options(selectinload(DailyMenuFeedback.user))
        .where(
            DailyMenuFeedback.family_id == family_id,
            DailyMenuFeedback.feedback_date == _today(),
            DailyMenuFeedback.id == feedback_id,
        )
    )
    return db.execute(statement).unique().scalar_one_or_none()


def load_today_menu_views(
    db: Session,
    family_id: int,
) -> list[DailyMenuView]:
    statement = (
        select(DailyMenuView)
        .join(DailyMenu, DailyMenu.id == DailyMenuView.daily_menu_id)
        .options(selectinload(DailyMenuView.user))
        .where(
            DailyMenu.family_id == family_id,
            DailyMenu.menu_date == _today(),
            DailyMenu.status == "confirmed",
        )
        .order_by(DailyMenuView.viewed_at.asc(), DailyMenuView.id.asc())
    )
    return list(db.execute(statement).unique().scalars().all())


def load_today_menu_versions(
    db: Session,
    family_id: int,
    *,
    limit: int = 5,
) -> list[DailyMenuVersion]:
    statement = (
        select(DailyMenuVersion)
        .options(selectinload(DailyMenuVersion.confirmed_by))
        .where(
            DailyMenuVersion.family_id == family_id,
            DailyMenuVersion.menu_date == _today(),
        )
        .order_by(DailyMenuVersion.version_number.desc())
        .limit(limit)
    )
    return list(db.execute(statement).unique().scalars().all())


def load_today_menu_version_by_id(
    db: Session,
    family_id: int,
    version_id: int,
) -> DailyMenuVersion | None:
    statement = (
        select(DailyMenuVersion)
        .options(selectinload(DailyMenuVersion.confirmed_by))
        .where(
            DailyMenuVersion.id == version_id,
            DailyMenuVersion.family_id == family_id,
            DailyMenuVersion.menu_date == _today(),
        )
    )
    return db.execute(statement).unique().scalar_one_or_none()


def load_today_menu_view_by_id(
    db: Session,
    family_id: int,
    view_id: int,
) -> DailyMenuView | None:
    statement = (
        select(DailyMenuView)
        .join(DailyMenu, DailyMenu.id == DailyMenuView.daily_menu_id)
        .options(selectinload(DailyMenuView.user))
        .where(
            DailyMenuView.id == view_id,
            DailyMenu.family_id == family_id,
            DailyMenu.menu_date == _today(),
        )
    )
    return db.execute(statement).unique().scalar_one_or_none()


def save_today_menu_view(
    db: Session,
    family: Family,
    user: User,
    viewed: bool,
) -> DailyMenuView | None:
    menu = load_today_menu(db, family.id)
    if menu is None or menu.status != "confirmed":
        raise ValueError("今晚菜单还未发布，暂时不能标记已看")

    statement = select(DailyMenuView).where(
        DailyMenuView.daily_menu_id == menu.id,
        DailyMenuView.family_id == family.id,
        DailyMenuView.user_id == user.id,
    )
    existing = db.execute(statement).scalar_one_or_none()

    if not viewed:
        if existing is not None:
            db.delete(existing)
            db.commit()
        return None

    if existing is None:
        existing = DailyMenuView(
            daily_menu_id=menu.id,
            family_id=family.id,
            user_id=user.id,
        )
        db.add(existing)
        db.commit()
    else:
        existing.viewed_at = datetime.now()
        db.commit()

    return load_today_menu_view_by_id(db, family.id, existing.id)


def confirm_today_menu(
    db: Session,
    family: Family,
    user: User,
    payload: DailyMenuConfirmRequest,
) -> DailyMenu:
    return _save_today_menu(db, family, user, payload, require_orders=True)


def publish_today_menu(
    db: Session,
    family: Family,
    user: User,
    payload: DailyMenuConfirmRequest,
) -> DailyMenu:
    """Publish a menu directly from the recipe library in one transaction."""
    return _save_today_menu(db, family, user, payload, require_orders=False)


def _save_today_menu(
    db: Session,
    family: Family,
    user: User,
    payload: DailyMenuConfirmRequest,
    *,
    require_orders: bool,
) -> DailyMenu:
    if user.id != family.creator_id:
        raise ValueError("只有家庭创建者可以确认最终菜单")

    recipe_ids = list(dict.fromkeys(payload.recipe_ids))

    if not recipe_ids:
        raise ValueError("请先选择要做的菜")

    if require_orders:
        orders = load_today_dish_orders(db, family.id)
        if not orders:
            raise ValueError("今天还没有点菜，不能确认最终菜单")

        available_recipe_ids = {order.recipe_id for order in orders}
        missing_recipe_ids = [
            recipe_id for recipe_id in recipe_ids if recipe_id not in available_recipe_ids
        ]
        if missing_recipe_ids:
            raise ValueError("所选菜品里有不在今日点菜中的项目")

    menu = load_today_menu(db, family.id)
    was_already_published = bool(menu and menu.status == "confirmed")
    if menu is None:
        menu = DailyMenu(
            family_id=family.id,
            menu_date=_today(),
        )
        db.add(menu)
    else:
        if menu.status == "confirmed":
            _snapshot_menu_version(db, menu, family.id)
        # A newly published version must be acknowledged again by everyone.
        db.query(DailyMenuView).filter(
            DailyMenuView.daily_menu_id == menu.id,
        ).delete(synchronize_session=False)
        menu.items.clear()

    db.flush()

    menu.status = "confirmed"
    menu.servings = payload.servings
    menu.meal_time = payload.meal_time
    menu.confirmed_by_id = user.id
    menu.confirmed_by = user
    menu.confirmed_at = datetime.now()
    menu.menu_date = _today()

    # The person who publishes a menu has necessarily seen this version.
    # Recording that acknowledgement in the same transaction keeps the
    # family view count accurate immediately after publishing.
    db.add(
        DailyMenuView(
            daily_menu_id=menu.id,
            family_id=family.id,
            user_id=user.id,
        )
    )

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
    notification_title = "今日菜单已更新" if was_already_published else "今日菜单已发布"
    notification_content = (
        f"{user.username} 更新了今天的菜单：{menu_title}"
        if was_already_published
        else f"{user.username} 发布了今天的菜单：{menu_title}"
    )
    create_family_notifications(
        db,
        family,
        user,
        type="daily_menu_updated" if was_already_published else "daily_menu_confirmed",
        title=notification_title,
        content=notification_content,
        related_id=menu.id,
        link_url="/menu",
    )

    rebuild_today_shopping_list(db, family, menu)
    db.commit()
    return load_today_menu(db, family.id) or menu


def _snapshot_menu_version(db: Session, menu: DailyMenu, family_id: int) -> None:
    """Keep a small, append-only history before replacing today's menu."""
    if not menu.items:
        return

    latest_version = db.execute(
        select(func.max(DailyMenuVersion.version_number)).where(
            DailyMenuVersion.daily_menu_id == menu.id,
        )
    ).scalar_one()
    version_number = int(latest_version or 0) + 1
    snapshot = DailyMenuVersion(
        daily_menu_id=menu.id,
        family_id=family_id,
        menu_date=menu.menu_date,
        version_number=version_number,
        servings=menu.servings,
        meal_time=menu.meal_time,
        recipe_ids=[item.recipe_id for item in menu.items],
        recipe_titles=[item.recipe.title for item in menu.items],
        confirmed_by_id=menu.confirmed_by_id,
        confirmed_at=menu.confirmed_at,
    )
    db.add(snapshot)
    db.flush()

    old_version_ids = list(
        db.execute(
            select(DailyMenuVersion.id)
            .where(DailyMenuVersion.daily_menu_id == menu.id)
            .order_by(DailyMenuVersion.version_number.desc())
            .offset(5)
        ).scalars()
    )
    if old_version_ids:
        db.query(DailyMenuVersion).filter(
            DailyMenuVersion.id.in_(old_version_ids),
        ).delete(synchronize_session=False)


def restore_today_menu_version(
    db: Session,
    family: Family,
    user: User,
    version_id: int,
) -> DailyMenu:
    if user.id != family.creator_id:
        raise ValueError("只有家庭创建者可以恢复菜单版本")

    version = load_today_menu_version_by_id(db, family.id, version_id)
    if version is None:
        raise ValueError("菜单版本不存在或已过期")

    payload = DailyMenuConfirmRequest(
        recipe_ids=version.recipe_ids,
        servings=version.servings,
        meal_time=version.meal_time,
    )
    return publish_today_menu(db, family, user, payload)


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
