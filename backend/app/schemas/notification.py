"""Notification schemas — request/response models for the notification system."""

from datetime import datetime
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    link: str | None = None
    read: bool = False
    read_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
    total: int


class NotificationCreate(BaseModel):
    """Internal-only schema for creating notifications programmatically."""
    user_id: int = 1
    type: str
    title: str
    message: str
    link: str | None = None
