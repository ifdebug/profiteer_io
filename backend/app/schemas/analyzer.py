"""Schemas for the Profitability Analyzer."""

from pydantic import BaseModel


class ProfitabilityRequest(BaseModel):
    query: str
    purchase_price: float | None = None
    condition: str = "new"
    weight_oz: float | None = None
    shipping_cost: float | None = None
    packaging_cost: float = 1.50


class MarketplaceResult(BaseModel):
    marketplace: str
    avg_sold_price: float
    active_listing_price: float | None = None
    platform_fee: float
    payment_processing_fee: float
    estimated_shipping: float
    packaging_cost: float
    net_profit: float
    profit_margin: float
    roi: float
    sales_volume: int | None = None
    profitability: str  # "strong", "marginal", "loss"


class ProfitabilityResponse(BaseModel):
    item_name: str
    item_image: str | None = None
    purchase_price: float
    best_marketplace: str
    best_profit: float
    marketplaces: list[MarketplaceResult]
