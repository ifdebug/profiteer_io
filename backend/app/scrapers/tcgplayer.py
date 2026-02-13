"""TCGPlayer scraper — fetches product cards from TCGPlayer search."""

import logging
import re
from urllib.parse import quote_plus

from app.scrapers.base import BaseScraper
from app.schemas.scraper import ScrapeResult, ScrapedListing

logger = logging.getLogger(__name__)

TCGPLAYER_SEARCH_URL = "https://www.tcgplayer.com/search/all/product"


class TcgplayerScraper(BaseScraper):
    """Scrape product listings from TCGPlayer search results.

    TCGPlayer shows:
      - Market Price: proxy for average sold price
      - Lowest Listed: proxy for active listing price
    Actual sold listings are not available from search pages.
    """

    request_timeout: float = 20.0  # TCGPlayer can be slow

    @property
    def marketplace(self) -> str:
        return "tcgplayer"

    @property
    def display_name(self) -> str:
        return "TCGPlayer"

    async def scrape(self, query: str, condition: str = "new") -> ScrapeResult:
        """Scrape TCGPlayer for product search results."""
        try:
            params = {"q": query, "view": "grid"}
            html = await self._fetch(TCGPLAYER_SEARCH_URL, params=params)
            if not html:
                return self._empty_result("Failed to fetch TCGPlayer results")

            soup = self._parse_html(html)

            # TCGPlayer uses product cards in search results
            # Try multiple possible selectors as TCGPlayer's markup changes
            product_cards = (
                soup.select(".search-result__product")
                or soup.select("[class*='product-card']")
                or soup.select(".product-card")
                or soup.select("[data-testid='product-card']")
            )

            if not product_cards:
                # Fallback: try to find price data in script tags (Next.js)
                return self._try_nextdata_extraction(soup, query)

            active_listings: list[ScrapedListing] = []
            market_prices: list[ScrapedListing] = []

            for card in product_cards:
                try:
                    result = self._parse_product_card(card)
                    if result:
                        market_listing, active_listing = result
                        if market_listing:
                            market_prices.append(market_listing)
                        if active_listing:
                            active_listings.append(active_listing)
                except Exception:
                    continue

            logger.info(
                "TCGPlayer: found %d market prices, %d active listings for '%s'",
                len(market_prices),
                len(active_listings),
                query,
            )

            # Market prices serve as sold price proxy
            return self._compute_aggregates(market_prices, active_listings)

        except Exception as exc:
            logger.error("TCGPlayer scrape failed: %s", exc)
            return self._empty_result(f"Scrape failed: {exc}")

    def _parse_product_card(
        self, card
    ) -> tuple[ScrapedListing | None, ScrapedListing | None] | None:
        """Parse a TCGPlayer product card.

        Returns (market_price_listing, active_listing) or None.
        """
        # Product name
        name_el = (
            card.select_one(".search-result__product-name")
            or card.select_one("[class*='product-card__name']")
            or card.select_one(".product-card__name")
            or card.select_one("h3")
            or card.select_one("[data-testid='product-name']")
        )
        if not name_el:
            return None
        name = name_el.get_text(strip=True)
        if not name:
            return None

        # URL
        link_el = card.select_one("a[href]")
        url = None
        if link_el:
            href = link_el.get("href", "")
            url = href if href.startswith("http") else f"https://www.tcgplayer.com{href}"

        # Image
        img_el = card.select_one("img")
        image_url = img_el.get("src") or img_el.get("data-src") if img_el else None

        # Market Price — labeled "Market Price" in the card
        market_price = self._extract_price(card, "market")
        market_listing = None
        if market_price and market_price > 0:
            market_listing = ScrapedListing(
                title=name,
                price=market_price,
                url=url,
                image_url=image_url,
            )

        # Lowest / Listed Price
        listed_price = self._extract_price(card, "listed")
        active_listing = None
        if listed_price and listed_price > 0:
            active_listing = ScrapedListing(
                title=name,
                price=listed_price,
                url=url,
                image_url=image_url,
            )

        if market_listing or active_listing:
            return (market_listing, active_listing)
        return None

    @staticmethod
    def _extract_price(card, price_type: str) -> float | None:
        """Extract a price from a product card by type.

        price_type: "market" or "listed"
        """
        # Look for labeled price spans
        all_text = card.get_text(" ", strip=True)

        if price_type == "market":
            patterns = [
                r"Market\s*Price[:\s]*\$([0-9,]+\.?\d*)",
                r"Market[:\s]*\$([0-9,]+\.?\d*)",
            ]
        else:
            patterns = [
                r"(?:Lowest|Listed)[:\s]*\$([0-9,]+\.?\d*)",
                r"From[:\s]*\$([0-9,]+\.?\d*)",
                r"Low[:\s]*\$([0-9,]+\.?\d*)",
            ]

        for pattern in patterns:
            match = re.search(pattern, all_text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(",", ""))
                except ValueError:
                    continue

        # Fallback: try to find price elements by class
        price_selectors = [
            f"[class*='{price_type}-price']",
            f"[class*='{price_type}Price']",
            f"[data-testid='{price_type}-price']",
        ]
        for sel in price_selectors:
            el = card.select_one(sel)
            if el:
                text = el.get_text(strip=True)
                amounts = re.findall(r"\$([0-9,]+\.?\d*)", text)
                if amounts:
                    try:
                        return float(amounts[0].replace(",", ""))
                    except ValueError:
                        continue

        return None

    def _try_nextdata_extraction(self, soup, query: str) -> ScrapeResult:
        """Try extracting data from __NEXT_DATA__ script tag (Next.js SSR)."""
        import json

        script = soup.select_one("script#__NEXT_DATA__")
        if not script:
            return self._empty_result("No product cards or __NEXT_DATA__ found")

        try:
            data = json.loads(script.string)
            # Navigate through Next.js page props to find product data
            props = data.get("props", {}).get("pageProps", {})
            results = props.get("searchResults", props.get("results", []))

            if not results:
                return self._empty_result("No results in __NEXT_DATA__")

            active_listings: list[ScrapedListing] = []
            market_prices: list[ScrapedListing] = []

            items = results if isinstance(results, list) else results.get("results", [])

            for item in items[:50]:
                name = item.get("productName") or item.get("name", "")
                if not name:
                    continue

                mp = item.get("marketPrice") or item.get("market_price")
                lp = item.get("lowestPrice") or item.get("lowest_price")
                url = item.get("url", "")
                if url and not url.startswith("http"):
                    url = f"https://www.tcgplayer.com{url}"
                img = item.get("imageUrl") or item.get("image", "")

                if mp and float(mp) > 0:
                    market_prices.append(
                        ScrapedListing(
                            title=name, price=float(mp), url=url, image_url=img
                        )
                    )
                if lp and float(lp) > 0:
                    active_listings.append(
                        ScrapedListing(
                            title=name, price=float(lp), url=url, image_url=img
                        )
                    )

            logger.info(
                "TCGPlayer __NEXT_DATA__: %d market prices, %d active for '%s'",
                len(market_prices),
                len(active_listings),
                query,
            )
            return self._compute_aggregates(market_prices, active_listings)

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.warning("TCGPlayer __NEXT_DATA__ parse error: %s", exc)
            return self._empty_result(f"__NEXT_DATA__ parse error: {exc}")
