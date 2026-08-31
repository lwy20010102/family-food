from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationsResponse,
    NotificationPublic,
)
from app.services.notification_service import (
    count_unread_notifications,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
    load_notification_by_id,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationsResponse)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationsResponse:
    notifications = list_notifications(db, current_user.id)
    unread_count = count_unread_notifications(db, current_user.id)
    return NotificationsResponse(
        notifications=[
            NotificationPublic.model_validate(notification)
            for notification in notifications
        ],
        unread_count=unread_count,
    )


@router.patch("/read-all", response_model=NotificationsResponse)
def read_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationsResponse:
    notifications = mark_all_notifications_read(db, current_user.id)
    unread_count = count_unread_notifications(db, current_user.id)
    return NotificationsResponse(
        notifications=[
            NotificationPublic.model_validate(notification)
            for notification in notifications
        ],
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    notification = load_notification_by_id(db, current_user.id, notification_id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在",
        )

    updated = mark_notification_read(db, notification)
    return NotificationResponse(
        notification=NotificationPublic.model_validate(updated),
    )
