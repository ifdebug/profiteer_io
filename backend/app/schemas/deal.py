"""Schemas for the Deals & Coupons Tracker."""

from datetime import date

from pydantic import BaseModel


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

    model_config = {"from_attributes": True}
