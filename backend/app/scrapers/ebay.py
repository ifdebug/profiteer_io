"""eBay scraper — fetches sold and active listings from eBay search.

Supports eBay's current (2026) card-based layout using `.s-card` elements,
with fallback to the legacy `.s-item` layout in case of regional differences.
"""

import logging
import re
from datetime import datetime, timezone

from app.scrapers.base import BaseScraper
from app.schemas.scraper import ScrapeResult, ScrapedListing

logger = logging.getLogger(__name__)

# eBay condition IDs
CONDITION_MAP = {
    "new": "1000",
    "open_box": "1500",
    "refurbished": "2500",
    "used": "3000",
    "for_parts": "7000",
}

EBAY_SEARCH_URL = "https://www.ebay.com/sch/i.html"

# Titles to skip — eBay inserts phantom header cards
SKIP_TITLES = {"shop on ebay", "results matching fewer words", "new listing"}


class EbayScraper(BaseScraper):
    """Scrape sold and active listings from eBay search results."""

    @property
    def marketplace(self) -> str:
        return "ebay"

    @property
    def display_name(self) -> str:
        return "eBay"

    async def scrape(self, query: str, condition: str = "new") -> ScrapeResult:
        """Scrape eBay for sold + active listings matching query."""
        try:
            sold = await self._scrape_listings(query, condition, sold_only=True)
            active = await self._scrape_listings(query, condition, sold_only=False)
            return self._compute_aggregates(sold, active)
        except Exception as exc:
            logger.error("eBay scrape failed: %s", exc)
            return self._empty_result(f"Scrape failed: {exc}")

    async def _scrape_listings(
        self,
        query: str,
        condition: str,
        sold_only: bool,
    ) -> list[ScrapedListing]:
        """Fetch and parse a single eBay search results page."""
        params = {
            "_nkw": query,
            "_sop": "12",  # sort by end date (most recent)
            "_ipg": "60",  # items per page
        }

        # Sold/completed filter
        if sold_only:
            params["LH_Complete"] = "1"
            params["LH_Sold"] = "1"

        # Condition filter
        cond_id = CONDITION_MAP.get(condition)
        if cond_id:
            params["LH_ItemCondition"] = cond_id

        html = await self._fetch(EBAY_SEARCH_URL, params=params)
        if not html:
            return []

        soup = self._parse_html(html)

        # Try new card-based layout first (2026+), then fall back to legacy
        cards = soup.select(".s-card.s-card--horizontal")
        if cards:
            listings = self._parse_cards(cards, sold_only)
        else:
            # Legacy layout fallback
            items = soup.select(".s-item")
            listings = self._parse_legacy_items(items, sold_only)

        logger.info(
            "eBay: found %d %s listings for '%s'",
            len(listings),
            "sold" if sold_only else "active",
            query,
        )
        return listings

    # ---- New card-based layout (2026+) ----

    def _parse_cards(
        self, cards: list, sold_only: bool
    ) -> list[ScrapedListing]:
        """Parse eBay's current s-card layout."""
        listings: list[ScrapedListing] = []

        for card in cards:
            try:
                listing = self._parse_card(card, sold_only)
                if listing:
                    listings.append(listing)
            except Exception:
                continue

        return listings

    def _parse_card(self, card, sold_only: bool) -> ScrapedListing | None:
        """Parse a single .s-card element into a ScrapedListing."""
        # Title — inside s-card__title div (role=heading)
        title_el = card.select_one(".s-card__title")
        if not title_el:
            return None
        title = title_el.get_text(strip=True)

        # Skip phantom header cards
        if title.lower() in SKIP_TITLES:
            return None

        # Price — element with s-card__price class
        # Multiple price elements may exist (sold price + original/strikethrough)
        # Take the first non-strikethrough price
        price_els = card.select("[class*='s-card__price']")
        price = None
        for el in price_els:
            classes = el.get("class", [])
            class_str = " ".join(classes) if isinstance(classes, list) else str(classes)
            if "strikethrough" in class_str:
                continue
            price = self._parse_price(el.get_text(strip=True))
            if price and price > 0:
                break

        if not price or price <= 0:
            return None

        # URL — from s-card__link anchor
        link_el = card.select_one("a.s-card__link[href]")
        url = link_el["href"] if link_el else None

        # Image — img.s-card__image
        img_el = card.select_one("img.s-card__image")
        image_url = None
        if img_el:
            image_url = (
                img_el.get("src")
                or img_el.get("data-defer-load")
                or img_el.get("data-src")
            )

        # Condition — in s-card__subtitle
        cond_el = card.select_one(".s-card__subtitle")
        condition_text = cond_el.get_text(strip=True) if cond_el else None

        # Sold date — in s-card__caption, text like "Sold  Feb 12, 2026"
        sold_date = None
        if sold_only:
            caption_el = card.select_one(".s-card__caption")
            if caption_el:
                caption_text = caption_el.get_text(strip=True)
                sold_date = self._parse_sold_date(caption_text)

        return ScrapedListing(
            title=title,
            price=price,
            condition=condition_text,
            sold_date=sold_date,
            url=url,
            image_url=image_url,
        )

    # ---- Legacy s-item layout (fallback) ----

    def _parse_legacy_items(
        self, items: list, sold_only: bool
    ) -> list[ScrapedListing]:
        """Parse eBay's legacy .s-item layout."""
        listings: list[ScrapedListing] = []

        for item in items:
            try:
                listing = self._parse_legacy_item(item, sold_only)
                if listing:
                    listings.append(listing)
            except Exception:
                continue

        return listings

    def _parse_legacy_item(self, item, sold_only: bool) -> ScrapedListing | None:
        """Parse a single .s-item element into a ScrapedListing."""
        title_el = item.select_one(".s-item__title")
        if not title_el:
            return None
        title = title_el.get_text(strip=True)

        if title.lower() in SKIP_TITLES:
            return None

        price_el = item.select_one(".s-item__price")
        if not price_el:
            return None
        price = self._parse_price(price_el.get_text(strip=True))
        if price is None or price <= 0:
            return None

        link_el = item.select_one(".s-item__link")
        url = link_el["href"] if link_el and link_el.has_attr("href") else None

        img_el = item.select_one(".s-item__image-img")
        image_url = None
        if img_el:
            image_url = img_el.get("src") or img_el.get("data-src")

        cond_el = item.select_one(".SECONDARY_INFO")
        condition_text = cond_el.get_text(strip=True) if cond_el else None

        sold_date = None
        if sold_only:
            sold_el = item.select_one(".s-item__title--tagblock .POSITIVE")
            if sold_el:
                sold_date = self._parse_sold_date(sold_el.get_text(strip=True))

        return ScrapedListing(
            title=title,
            price=price,
            condition=condition_text,
            sold_date=sold_date,
            url=url,
            image_url=image_url,
        )

    # ---- Shared parsing helpers ----

    @staticmethod
    def _parse_price(text: str) -> float | None:
        """Parse eBay price text.

        Handles:
            "$74.99"
            "$50.00 to $75.00"  → average of range
            "C $74.99"          → skip non-USD
        """
        # Skip non-USD currencies (C $, AU $, £, €, etc.)
        if re.match(r"^[A-Z]{1,3}\s*\$", text):
            return None

        # Find all dollar amounts
        amounts = re.findall(r"\$([0-9,]+\.?\d*)", text)
        if not amounts:
            return None

        prices = []
        for amt in amounts:
            try:
                prices.append(float(amt.replace(",", "")))
            except ValueError:
                continue

        if not prices:
            return None

        # Range ("$50.00 to $75.00") → average
        return round(sum(prices) / len(prices), 2)

    @staticmethod
    def _parse_sold_date(text: str) -> datetime | None:
        """Parse 'Sold  Feb 3, 2026' into a datetime."""
        # Strip "Sold" prefix and extra whitespace
        cleaned = re.sub(r"^Sold\s+", "", text, flags=re.IGNORECASE).strip()
        if not cleaned:
            return None
        try:
            return datetime.strptime(cleaned, "%b %d, %Y").replace(tzinfo=timezone.utc)
        except ValueError:
            # Try alternate format without comma
            try:
                return datetime.strptime(cleaned, "%b %d %Y").replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                return None
