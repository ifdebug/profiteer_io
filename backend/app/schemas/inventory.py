"""Schemas for the Inventory Manager."""

from datetime import date

from pydantic import BaseModel


class InventoryItemCreate(BaseModel):
    name: str
    purchase_price: float
    purchase_date: date | None = None
    purchase_source: str | None = None
    condition: str = "new"
    quantity: int = 1
    listing_status: str = "unlisted"
    storage_location: str | None = None
    notes: str | None = None
    current_value: float | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    purchase_price: float | None = None
    purchase_date: date | None = None
    purchase_source: str | None = None
    condition: str | None = None
    quantity: int | None = None
    listing_status: str | None = None
    storage_location: str | None = None
    notes: str | None = None
    current_value: float | None = None


class InventoryItemResponse(BaseModel):
    id: int
    user_id: int = 1
    name: str
    purchase_price: float
    purchase_date: date | None = None
    purchase_source: str | None = None
    condition: str
    quantity: int
    listing_status: str
    storage_location: str | None = None
    notes: str | None = None
    current_value: float | None = None
    profit_loss: float | None = None

    model_config = {"from_attributes": True}


class InventorySummaryStats(BaseModel):
    total_items: int
    total_value: float
    total_cost: float
    unrealized_pl: float


class InventorySummary(BaseModel):
    summary: InventorySummaryStats
    items: list[InventoryItemResponse]
