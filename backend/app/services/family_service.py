from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.family import Family, FamilyMember
from app.models.user import User
from app.services.notification_service import create_family_notifications

INVITE_CODE_LENGTH = 6
INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PERSONAL_WORKSPACE_PREFIX = "__personal_workspace__:"


def personal_workspace_name(user_id: int) -> str:
    return f"{PERSONAL_WORKSPACE_PREFIX}{user_id}"


def normalize_invite_code(invite_code: str) -> str:
    return invite_code.strip().upper()


def get_user_membership(db: Session, user_id: int) -> FamilyMember | None:
    statement = select(FamilyMember).where(FamilyMember.user_id == user_id)
    return db.execute(statement).scalar_one_or_none()


def get_user_family(db: Session, user_id: int) -> Family | None:
    membership = get_user_membership(db, user_id)
    if membership is None:
        return None
    return load_family_by_id(db, membership.family_id)


def get_user_workspace(db: Session, user_id: int) -> Family:
    """Return the shared family or create a private workspace for the user."""
    family = get_user_family(db, user_id)
    if family is not None:
        return family

    statement = select(Family).where(
        Family.creator_id == user_id,
        Family.name == personal_workspace_name(user_id),
    )
    personal = db.execute(statement).scalar_one_or_none()
    if personal is None:
        personal = Family(
            name=personal_workspace_name(user_id),
            invite_code=generate_unique_invite_code(db),
            creator_id=user_id,
        )
        db.add(personal)
        db.commit()
        db.refresh(personal)

    return load_family_by_id(db, personal.id) or personal


def get_family_by_invite_code(db: Session, invite_code: str) -> Family | None:
    statement = select(Family).where(
        Family.invite_code == normalize_invite_code(invite_code),
        ~Family.name.startswith(PERSONAL_WORKSPACE_PREFIX),
    )
    return db.execute(statement).scalar_one_or_none()


def load_family_by_id(db: Session, family_id: int) -> Family | None:
    statement = (
        select(Family)
        .where(Family.id == family_id)
        .options(
            selectinload(Family.members).selectinload(FamilyMember.user),
            selectinload(Family.creator),
        )
    )
    return db.execute(statement).unique().scalar_one_or_none()


def list_family_members(db: Session, family_id: int) -> list[FamilyMember]:
    statement = (
        select(FamilyMember)
        .where(FamilyMember.family_id == family_id)
        .options(selectinload(FamilyMember.user))
        .order_by(FamilyMember.joined_at)
    )
    return list(db.execute(statement).scalars().all())


def generate_unique_invite_code(db: Session) -> str:
    for _ in range(100):
        code = "".join(
            secrets.choice(INVITE_CODE_ALPHABET) for _ in range(INVITE_CODE_LENGTH)
        )
        statement = select(Family.id).where(Family.invite_code == code)
        exists = db.execute(statement).scalar_one_or_none()
        if exists is None:
            return code
    raise RuntimeError("无法生成家庭邀请码")


def create_family_for_user(db: Session, owner: User, name: str) -> Family:
    family = Family(
        name=name.strip(),
        invite_code=generate_unique_invite_code(db),
        creator_id=owner.id,
    )
    db.add(family)
    db.flush()

    db.add(
        FamilyMember(
            family_id=family.id,
            user_id=owner.id,
            role="owner",
            nickname=owner.username.strip(),
        )
    )
    migrate_personal_workspace(db, owner.id, family.id)
    db.commit()
    return load_family_by_id(db, family.id) or family


def add_member_to_family(db: Session, family: Family, user: User) -> Family:
    create_family_notifications(
        db,
        family,
        user,
        type="family_member_joined",
        title="新的家庭成员",
        content=f"{user.username} 加入了家庭「{family.name}」",
        related_id=user.id,
        link_url="/family",
    )

    db.add(
        FamilyMember(
            family_id=family.id,
            user_id=user.id,
            role="member",
            nickname=user.username.strip(),
        )
    )
    migrate_personal_workspace(db, user.id, family.id)
    db.commit()
    return load_family_by_id(db, family.id) or family


def migrate_personal_workspace(db: Session, user_id: int, family_id: int) -> None:
    """Move personal data into a newly selected family without touching shared data."""
    from app.models.daily_menu import DailyMenu, DailyMenuItem
    from app.models.daily_menu_feedback import DailyMenuFeedback
    from app.models.daily_menu_view import DailyMenuView
    from app.models.daily_menu_version import DailyMenuVersion
    from app.models.dish_order import DishOrder
    from app.models.recipe import Recipe
    from app.models.recipe_import_backup import RecipeImportBackup
    from app.models.shopping_list import ShoppingList, ShoppingListItem
    from app.models.weekly_menu import WeeklyMenuItem

    personal_id = db.execute(
        select(Family.id).where(
            Family.creator_id == user_id,
            Family.name == personal_workspace_name(user_id),
        )
    ).scalar_one_or_none()
    if personal_id is None or personal_id == family_id:
        return

    db.query(Recipe).filter(Recipe.family_id == personal_id).update(
        {Recipe.family_id: family_id}, synchronize_session=False
    )
    db.query(DishOrder).filter(
        DishOrder.family_id == personal_id,
        DishOrder.user_id == user_id,
    ).update({DishOrder.family_id: family_id}, synchronize_session=False)
    db.query(RecipeImportBackup).filter(
        RecipeImportBackup.family_id == personal_id,
    ).update({RecipeImportBackup.family_id: family_id}, synchronize_session=False)

    source_weekly_items = list(
        db.execute(
            select(WeeklyMenuItem)
            .where(WeeklyMenuItem.family_id == personal_id)
            .order_by(WeeklyMenuItem.id)
        ).scalars()
    )
    for source_item in source_weekly_items:
        duplicate_id = db.execute(
            select(WeeklyMenuItem.id).where(
                WeeklyMenuItem.family_id == family_id,
                WeeklyMenuItem.menu_date == source_item.menu_date,
                WeeklyMenuItem.meal_type == source_item.meal_type,
                WeeklyMenuItem.recipe_id == source_item.recipe_id,
            )
        ).scalar_one_or_none()
        if duplicate_id is not None:
            db.delete(source_item)
        else:
            source_item.family_id = family_id

    source_feedbacks = list(
        db.execute(
            select(DailyMenuFeedback).where(
                DailyMenuFeedback.family_id == personal_id,
                DailyMenuFeedback.user_id == user_id,
            )
        ).scalars()
    )
    for source_feedback in source_feedbacks:
        duplicate = db.execute(
            select(DailyMenuFeedback.id).where(
                DailyMenuFeedback.family_id == family_id,
                DailyMenuFeedback.user_id == source_feedback.user_id,
                DailyMenuFeedback.recipe_id == source_feedback.recipe_id,
                DailyMenuFeedback.feedback_date == source_feedback.feedback_date,
            )
        ).scalar_one_or_none()
        if duplicate is not None:
            db.delete(source_feedback)
        else:
            source_feedback.family_id = family_id

    source_menus = list(
        db.execute(
            select(DailyMenu)
            .where(DailyMenu.family_id == personal_id)
            .options(selectinload(DailyMenu.items))
        ).scalars()
    )
    for source_menu in source_menus:
        target_menu = db.execute(
            select(DailyMenu)
            .where(
                DailyMenu.family_id == family_id,
                DailyMenu.menu_date == source_menu.menu_date,
            )
            .options(selectinload(DailyMenu.items))
        ).scalar_one_or_none()
        if target_menu is None:
            source_menu.family_id = family_id
            db.query(DailyMenuView).filter(
                DailyMenuView.daily_menu_id == source_menu.id,
            ).update({DailyMenuView.family_id: family_id}, synchronize_session=False)
            db.query(DailyMenuVersion).filter(
                DailyMenuVersion.daily_menu_id == source_menu.id,
            ).update({DailyMenuVersion.family_id: family_id}, synchronize_session=False)
            continue

        target_recipe_ids = {item.recipe_id for item in target_menu.items}
        for source_item in source_menu.items:
            if source_item.recipe_id not in target_recipe_ids:
                target_menu.items.append(
                    DailyMenuItem(
                        recipe_id=source_item.recipe_id,
                        status=source_item.status,
                        sort_order=len(target_menu.items),
                    )
                )
        source_views = list(
            db.execute(
                select(DailyMenuView).where(
                    DailyMenuView.daily_menu_id == source_menu.id,
                )
            ).scalars()
        )
        target_view_user_ids = set(
            db.execute(
                select(DailyMenuView.user_id).where(
                    DailyMenuView.daily_menu_id == target_menu.id,
                )
            ).scalars()
        )
        for source_view in source_views:
            if source_view.user_id in target_view_user_ids:
                db.delete(source_view)
            else:
                source_view.daily_menu_id = target_menu.id
                source_view.family_id = family_id
                target_view_user_ids.add(source_view.user_id)

        source_versions = list(
            db.execute(
                select(DailyMenuVersion)
                .where(DailyMenuVersion.daily_menu_id == source_menu.id)
                .order_by(DailyMenuVersion.version_number.asc(), DailyMenuVersion.id.asc())
            ).scalars()
        )
        next_version_number = db.execute(
            select(DailyMenuVersion.version_number)
            .where(DailyMenuVersion.daily_menu_id == target_menu.id)
            .order_by(DailyMenuVersion.version_number.desc())
            .limit(1)
        ).scalar_one_or_none()
        next_version_number = int(next_version_number or 0) + 1
        for source_version in source_versions:
            source_version.daily_menu_id = target_menu.id
            source_version.family_id = family_id
            source_version.version_number = next_version_number
            next_version_number += 1

        db.delete(source_menu)

    source_lists = list(
        db.execute(
            select(ShoppingList)
            .where(ShoppingList.family_id == personal_id)
            .options(selectinload(ShoppingList.items))
        ).scalars()
    )
    for source_list in source_lists:
        target_list = db.execute(
            select(ShoppingList)
            .where(
                ShoppingList.family_id == family_id,
                ShoppingList.menu_date == source_list.menu_date,
            )
            .options(selectinload(ShoppingList.items))
        ).scalar_one_or_none()
        if target_list is None:
            source_list.family_id = family_id
            continue

        target_keys = {(item.name.strip().casefold(), item.unit.strip().casefold()) for item in target_list.items}
        for source_item in source_list.items:
            key = (source_item.name.strip().casefold(), source_item.unit.strip().casefold())
            if key not in target_keys:
                target_list.items.append(
                    ShoppingListItem(
                        name=source_item.name,
                        amount=source_item.amount,
                        unit=source_item.unit,
                        is_purchased=source_item.is_purchased,
                    )
                )
        db.delete(source_list)
