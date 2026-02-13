"""Schemas for scraper data exchange between scrapers, cache, and service layer."""

from datetime import datetime

from pydantic import BaseModel


class ScrapedListing(BaseModel):
    """A single listing or sale scraped from a marketplace."""

    title: str
    price: float
    condition: str | None = None
    sold_date: datetime | None = None
    url: str | None = None
    image_url: str | None = None


class ScrapeResult(BaseModel):
    """Aggregated result from a single marketplace scraper."""

    marketplace: str  # internal key, e.g. "ebay" — matches MARKETPLACE_FEES keys
    display_name: str  # human-readable, e.g. "eBay"
    sold_listings: list[ScrapedListing] = []
    active_listings: list[ScrapedListing] = []
    avg_sold_price: float | None = None
    median_sold_price: float | None = None
    active_listing_price: float | None = None  # median of active listings
    sales_volume: int = 0  # count of sold items found
    success: bool = True
    error_message: str | None = None
    scraped_at: datetime | None = None
