"""Schemas for the Deals & Coupons Tracker."""

from datetime import date, datetime

from pydantic import BaseModel


class DealCreate(BaseModel):
    retailer: str
    title: str
    description: str | None = None
    url: str | None = None
    original_price: float | None = None
    deal_price: float = 0.0
    discount_pct: float | None = None  # Auto-computed if omitted
    category: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    profit_potential: float | None = None  # Auto-estimated if omitted


class DealResponse(BaseModel):
    id: int
    retailer: str
    title: str
    description: str | None = None
    url: str | None = None
    original_price: float | None = None
    deal_price: float
    discount_pct: float | None = None
    category: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    upvotes: int = 0
    downvotes: int = 0
    profit_potential: float | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UpcomingEvent(BaseModel):
    name: str
    date: str
    retailers: list[str] = []


class DealsListResponse(BaseModel):
    deals: list[DealResponse] = []
    total: int = 0
    upcoming_events: list[UpcomingEvent] = []
    categories: list[str] = []
    retailers: list[str] = []
