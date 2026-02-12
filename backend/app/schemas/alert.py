"""Schemas for the Alert/Notification system."""

from datetime import datetime

from pydantic import BaseModel


class AlertCreate(BaseModel):
    item_id: int
    alert_type: str  # "price_above", "price_below", "hype_above"
    threshold_value: float


class AlertResponse(BaseModel):
    id: int
    item_id: int
    alert_type: str
    threshold_value: float
    is_active: bool
    last_triggered: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    read: bool = False
    timestamp: datetime
    link: str | None = None
