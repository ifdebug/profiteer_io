"""Schemas for the Price Trend Tracker."""

from pydantic import BaseModel


class PricePoint(BaseModel):
    date: str
    price: float


class MarketplaceTrend(BaseModel):
    data: list[PricePoint]
    current: float
    high: float
    low: float
    avg: float


class TrendVolume(BaseModel):
    total_sales_period: int
    avg_daily_sales: float


class TrendResponse(BaseModel):
    item_id: int
    item_name: str
    period: str
    current_price: float
    price_change_pct: float
    trend: str  # "rising" | "falling" | "stable"
    marketplaces: dict[str, MarketplaceTrend]
    volume: TrendVolume


class ItemSearchResult(BaseModel):
    id: int
    name: str
    category: str | None = None
    image_url: str | None = None
    price_count: int = 0

    model_config = {"from_attributes": True}
