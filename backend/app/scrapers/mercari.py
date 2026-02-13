"""Mercari scraper — fetches sold item data from Mercari search.

This is a stretch-goal scraper. Mercari uses React/Next.js and heavy
client-side rendering, so extraction can be fragile. All failures are
graceful — the scraper returns success=False and the analyzer moves on.
"""

import json
import logging
import re
from datetime import datetime, timezone
from urllib.parse import quote_plus

from app.scrapers.base import BaseScraper
from app.schemas.scraper import ScrapeResult, ScrapedListing

logger = logging.getLogger(__name__)

MERCARI_SEARCH_URL = "https://www.mercari.com/search/"


class MercariScraper(BaseScraper):
    """Scrape sold items from Mercari search results.

    Strategy:
      1. Try extracting from __NEXT_DATA__ script tag (Next.js SSR data)
      2. Fallback to HTML parsing of item cards
      3. If both fail, return success=False gracefully
    """

    request_timeout: float = 20.0
    max_retries: int = 1  # Mercari is aggressive with anti-bot

    @property
    def marketplace(self) -> str:
        return "mercari"

    @property
    def display_name(self) -> str:
        return "Mercari"

    async def scrape(self, query: str, condition: str = "new") -> ScrapeResult:
        """Scrape Mercari for sold items matching query."""
        try:
            # Fetch sold items
            sold = await self._scrape_sold(query, condition)

            # Fetch active listings (remove sold filter)
            active = await self._scrape_active(query, condition)

            if not sold and not active:
                return self._empty_result("No Mercari listings found")

            return self._compute_aggregates(sold, active)

        except Exception as exc:
            logger.error("Mercari scrape failed: %s", exc)
            return self._empty_result(f"Scrape failed: {exc}")

    async def _scrape_sold(
        self, query: str, condition: str
    ) -> list[ScrapedListing]:
        """Fetch sold items from Mercari."""
        params = {"keyword": query, "status": "sold_out"}
        if condition == "new":
            params["itemCondition"] = "1"  # New / Unused

        html = await self._fetch(MERCARI_SEARCH_URL, params=params)
        if not html:
            return []

        soup = self._parse_html(html)

        # Strategy 1: __NEXT_DATA__
        listings = self._extract_from_nextdata(soup, sold=True)
        if listings:
            return listings

        # Strategy 2: HTML parsing
        return self._extract_from_html(soup, sold=True)

    async def _scrape_active(
        self, query: str, condition: str
    ) -> list[ScrapedListing]:
        """Fetch active (for sale) items from Mercari."""
        params = {"keyword": query, "status": "on_sale"}
        if condition == "new":
            params["itemCondition"] = "1"

        html = await self._fetch(MERCARI_SEARCH_URL, params=params)
        if not html:
            return []

        soup = self._parse_html(html)

        listings = self._extract_from_nextdata(soup, sold=False)
        if listings:
            return listings

        return self._extract_from_html(soup, sold=False)

    def _extract_from_nextdata(self, soup, sold: bool) -> list[ScrapedListing]:
        """Try extracting listings from Mercari's __NEXT_DATA__ JSON."""
        script = soup.select_one("script#__NEXT_DATA__")
        if not script or not script.string:
            return []

        try:
            data = json.loads(script.string)
            props = data.get("props", {}).get("pageProps", {})

            # Navigate to search results — path may vary
            items_data = (
                props.get("searchResults")
                or props.get("items")
                or props.get("data", {}).get("search", {}).get("itemsList", [])
            )

            if not items_data:
                return []

            items = items_data if isinstance(items_data, list) else []

            listings: list[ScrapedListing] = []
            for item in items[:50]:
                name = item.get("name") or item.get("title", "")
                price_val = item.get("price") or item.get("itemPrice", 0)

                try:
                    price = float(price_val)
                except (TypeError, ValueError):
                    continue

                if not name or price <= 0:
                    continue

                item_id = item.get("id") or item.get("itemId", "")
                url = f"https://www.mercari.com/us/item/{item_id}/" if item_id else None

                img = item.get("imageUrl") or item.get("thumbnails", [None])[0]
                if isinstance(img, dict):
                    img = img.get("src") or img.get("url")

                # Condition text
                cond_text = item.get("itemCondition", {})
                if isinstance(cond_text, dict):
                    cond_text = cond_text.get("name")
                elif not isinstance(cond_text, str):
                    cond_text = None

                # Sold date
                sold_date = None
                if sold:
                    updated = item.get("updated") or item.get("soldAt")
                    if updated:
                        try:
                            sold_date = datetime.fromtimestamp(
                                int(updated), tz=timezone.utc
                            )
                        except (ValueError, TypeError, OSError):
                            pass

                listings.append(
                    ScrapedListing(
                        title=name,
                        price=price,
                        condition=cond_text if isinstance(cond_text, str) else None,
                        sold_date=sold_date,
                        url=url,
                        image_url=img if isinstance(img, str) else None,
                    )
                )

            logger.info(
                "Mercari __NEXT_DATA__: found %d %s listings",
                len(listings),
                "sold" if sold else "active",
            )
            return listings

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.debug("Mercari __NEXT_DATA__ parse failed: %s", exc)
            return []

    def _extract_from_html(self, soup, sold: bool) -> list[ScrapedListing]:
        """Fallback: parse Mercari search results from HTML item cards."""
        # Mercari uses various card selectors depending on version
        cards = (
            soup.select("[data-testid='ItemCell']")
            or soup.select("[class*='ItemCell']")
            or soup.select("[class*='SearchResultItem']")
            or soup.select("[class*='item-cell']")
        )

        if not cards:
            logger.debug("Mercari: no item cards found in HTML")
            return []

        listings: list[ScrapedListing] = []

        for card in cards[:50]:
            try:
                # Title
                name_el = (
                    card.select_one("[data-testid='ItemName']")
                    or card.select_one("[class*='ItemName']")
                    or card.select_one("span[class*='name']")
                    or card.select_one("p")
                )
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                if not name:
                    continue

                # Price
                price_el = (
                    card.select_one("[data-testid='ItemPrice']")
                    or card.select_one("[class*='ItemPrice']")
                    or card.select_one("[class*='price']")
                )
                if not price_el:
                    continue
                price_text = price_el.get_text(strip=True)
                amounts = re.findall(r"\$?([0-9,]+\.?\d*)", price_text)
                if not amounts:
                    continue
                try:
                    price = float(amounts[0].replace(",", ""))
                except ValueError:
                    continue
                if price <= 0:
                    continue

                # URL
                link = card.select_one("a[href]")
                url = None
                if link:
                    href = link.get("href", "")
                    url = (
                        href
                        if href.startswith("http")
                        else f"https://www.mercari.com{href}"
                    )

                # Image
                img_el = card.select_one("img")
                image_url = (
                    img_el.get("src") or img_el.get("data-src") if img_el else None
                )

                listings.append(
                    ScrapedListing(
                        title=name,
                        price=price,
                        url=url,
                        image_url=image_url,
                    )
                )

            except Exception:
                continue

        logger.info(
            "Mercari HTML: found %d %s listings",
            len(listings),
            "sold" if sold else "active",
        )
        return listings
