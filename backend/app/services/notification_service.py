from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.family import Family
from app.models.notification import Notification
from app.models.user import User

DEFAULT_NOTIFICATION_LIMIT = 50


def _load_notification_query():
    return select(Notification).options(selectinload(Notification.sender))


def list_notifications(
    db: Session,
    user_id: int,
    limit: int = DEFAULT_NOTIFICATION_LIMIT,
) -> list[Notification]:
    statement = (
        _load_notification_query()
        .where(Notification.receiver_id == user_id)
        .order_by(
            Notification.is_read.asc(),
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .limit(limit)
    )
    return list(db.execute(statement).unique().scalars().all())


def count_unread_notifications(db: Session, user_id: int) -> int:
    statement = select(func.count(Notification.id)).where(
        Notification.receiver_id == user_id,
        Notification.is_read.is_(False),
    )
    return int(db.execute(statement).scalar_one() or 0)


def load_notification_by_id(
    db: Session,
    user_id: int,
    notification_id: int,
) -> Notification | None:
    statement = _load_notification_query().where(
        Notification.receiver_id == user_id,
        Notification.id == notification_id,
    )
    return db.execute(statement).unique().scalar_one_or_none()


def create_family_notifications(
    db: Session,
    family: Family,
    sender: User,
    *,
    type: str,
    title: str,
    content: str,
    related_id: int | None = None,
    link_url: str | None = None,
) -> list[Notification]:
    receiver_ids = sorted(
        {
            member.user_id
            for member in family.members
            if member.user_id != sender.id
        }
    )

    if not receiver_ids:
        return []

    notifications = [
        Notification(
            family_id=family.id,
            sender_id=sender.id,
            receiver_id=receiver_id,
            type=type,
            title=title,
            content=content,
            related_id=related_id,
            link_url=link_url,
        )
        for receiver_id in receiver_ids
    ]
    db.add_all(notifications)
    return notifications


def mark_notification_read(
    db: Session,
    notification: Notification,
) -> Notification:
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now()
        db.commit()

    return load_notification_by_id(db, notification.receiver_id, notification.id) or notification


def mark_all_notifications_read(
    db: Session,
    user_id: int,
) -> list[Notification]:
    statement = select(Notification).where(
        Notification.receiver_id == user_id,
        Notification.is_read.is_(False),
    )
    notifications = list(db.execute(statement).scalars().all())

    if not notifications:
        return list_notifications(db, user_id)

    now = datetime.now()
    for notification in notifications:
        notification.is_read = True
        notification.read_at = now

    db.commit()
    return list_notifications(db, user_id)
