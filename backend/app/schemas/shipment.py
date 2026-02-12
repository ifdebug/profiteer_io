"""Schemas for the Shipment Tracker."""

from datetime import datetime

from pydantic import BaseModel


class ShipmentEvent(BaseModel):
    timestamp: datetime
    status: str
    location: str | None = None
    description: str


class ShipmentCreate(BaseModel):
    tracking_number: str
    carrier: str
    origin: str | None = None
    destination: str | None = None
    items: dict | None = None


class ShipmentResponse(BaseModel):
    id: int
    tracking_number: str
    carrier: str
    status: str
    origin: str | None = None
    destination: str | None = None
    estimated_delivery: datetime | None = None
    events: list[ShipmentEvent] = []
    created_at: datetime

    model_config = {"from_attributes": True}
