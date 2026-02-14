"""Notification system — real CRUD with PostgreSQL persistence."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.notification import NotificationResponse, NotificationListResponse
from app.services.notification_service import NotificationService

router = APIRouter()
service = NotificationService()

DEFAULT_USER_ID = 1


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List notifications for the current user."""
    data = await service.list(db, user_id=DEFAULT_USER_ID, unread_only=unread_only, limit=limit, offset=offset)
    return data


@router.get("/unread-count")
async def get_unread_count(db: AsyncSession = Depends(get_db)):
    """Quick unread count for the notification badge."""
    count = await service.get_unread_count(db, user_id=DEFAULT_USER_ID)
    return {"unread_count": count}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(notification_id: int, db: AsyncSession = Depends(get_db)):
    """Mark a single notification as read."""
    notif = await service.mark_read(db, notification_id, user_id=DEFAULT_USER_ID)
    if not notif:
        raise HTTPException(status_code=404, detail=f"Notification {notification_id} not found")
    return notif


@router.put("/read-all")
async def mark_all_read(db: AsyncSession = Depends(get_db)):
    """Mark all unread notifications as read."""
    count = await service.mark_all_read(db, user_id=DEFAULT_USER_ID)
    return {"success": True, "message": f"Marked {count} notifications as read", "count": count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a single notification."""
    deleted = await service.delete(db, notification_id, user_id=DEFAULT_USER_ID)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Notification {notification_id} not found")
    return {"success": True, "message": f"Notification {notification_id} deleted"}


@router.delete("/read")
async def delete_all_read(db: AsyncSession = Depends(get_db)):
    """Delete all read notifications."""
    count = await service.delete_all_read(db, user_id=DEFAULT_USER_ID)
    return {"success": True, "message": f"Deleted {count} read notifications", "count": count}
