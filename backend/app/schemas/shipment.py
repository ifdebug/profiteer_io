"""Schemas for the Shipment Tracker."""

from datetime import datetime

from pydantic import BaseModel


class ShipmentEvent(BaseModel):
    timestamp: str
    status: str
    location: str | None = None
    description: str


class ShipmentCreate(BaseModel):
    tracking_number: str
    carrier: str | None = None  # None or "auto" = auto-detect
    origin: str | None = None
    destination: str | None = None
    items: dict | None = None


class ShipmentResponse(BaseModel):
    id: int
    user_id: int
    tracking_number: str
    carrier: str
    status: str
    origin: str | None = None
    destination: str | None = None
    estimated_delivery: datetime | None = None
    events: list[ShipmentEvent] = []
    items: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ShipmentSummaryStats(BaseModel):
    total: int = 0
    label_created: int = 0
    in_transit: int = 0
    out_for_delivery: int = 0
    delivered: int = 0
    exception: int = 0


class ShipmentSummary(BaseModel):
    shipments: list[ShipmentResponse] = []
    summary: ShipmentSummaryStats = ShipmentSummaryStats()
