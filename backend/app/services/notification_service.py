"""Notification service — CRUD operations and notification generation."""

import logging
from datetime import datetime

from sqlalchemy import select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = 1


class NotificationService:
    async def list(
        self,
        db: AsyncSession,
        user_id: int = DEFAULT_USER_ID,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """Get notifications for a user with unread count."""
        query = select(Notification).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(Notification.read == False)  # noqa: E712

        query = query.order_by(desc(Notification.created_at)).limit(limit).offset(offset)

        result = await db.execute(query)
        notifications = list(result.scalars().all())

        # Get total and unread counts
        count_q = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id
        )
        total = (await db.execute(count_q)).scalar() or 0

        unread_q = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.read == False,  # noqa: E712
        )
        unread_count = (await db.execute(unread_q)).scalar() or 0

        return {
            "notifications": notifications,
            "unread_count": unread_count,
            "total": total,
        }

    async def mark_read(self, db: AsyncSession, notification_id: int, user_id: int = DEFAULT_USER_ID) -> Notification | None:
        """Mark a single notification as read."""
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notif = result.scalar_one_or_none()
        if not notif:
            return None

        notif.read = True
        notif.read_at = datetime.utcnow()
        await db.commit()
        await db.refresh(notif)
        return notif

    async def mark_all_read(self, db: AsyncSession, user_id: int = DEFAULT_USER_ID) -> int:
        """Mark all notifications as read for a user. Returns count updated."""
        now = datetime.utcnow()
        result = await db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read == False,  # noqa: E712
            )
            .values(read=True, read_at=now)
        )
        await db.commit()
        return result.rowcount

    async def delete(self, db: AsyncSession, notification_id: int, user_id: int = DEFAULT_USER_ID) -> bool:
        """Delete a single notification."""
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notif = result.scalar_one_or_none()
        if not notif:
            return False

        await db.delete(notif)
        await db.commit()
        return True

    async def delete_all_read(self, db: AsyncSession, user_id: int = DEFAULT_USER_ID) -> int:
        """Delete all read notifications for a user. Returns count deleted."""
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.read == True,  # noqa: E712
            )
        )
        notifications = list(result.scalars().all())
        count = len(notifications)
        for notif in notifications:
            await db.delete(notif)
        await db.commit()
        return count

    async def create(
        self,
        db: AsyncSession,
        user_id: int,
        type: str,
        title: str,
        message: str,
        link: str | None = None,
    ) -> Notification:
        """Create a new notification."""
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        logger.info("Created notification id=%d type=%s for user=%d", notif.id, type, user_id)
        return notif

    async def get_unread_count(self, db: AsyncSession, user_id: int = DEFAULT_USER_ID) -> int:
        """Quick unread count for badge."""
        result = await db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id,
                Notification.read == False,  # noqa: E712
            )
        )
        return result.scalar() or 0
