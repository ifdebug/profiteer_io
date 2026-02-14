"""Pydantic schemas for the Arbitrage Finder endpoints."""

from pydantic import BaseModel


class ArbitrageOpportunity(BaseModel):
    """A single cross-marketplace arbitrage opportunity."""

    id: int  # item_id — used as stable identifier
    item_name: str
    category: str | None = None
    image_url: str | None = None

    buy_platform: str
    buy_price: float
    buy_condition: str | None = "new"

    sell_platform: str
    sell_price: float

    estimated_fees: float
    estimated_shipping: float
    estimated_profit: float
    profit_margin: float
    roi: float

    risk_score: int  # 0-100
    confidence: str  # "high" | "medium" | "low"
    avg_days_to_sell: int | None = None


class OpportunitiesResponse(BaseModel):
    """Response for the arbitrage opportunities endpoint."""

    opportunities: list[ArbitrageOpportunity]
    total: int
    categories: list[str]


class ArbitrageScanRequest(BaseModel):
    """Request body for triggering a fresh arbitrage scan."""

    query: str
    purchase_price: float | None = None
    condition: str = "new"
