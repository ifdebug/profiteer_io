"""Abstract base scraper with shared HTTP infrastructure."""

import asyncio
import logging
import random
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from statistics import median

import httpx
from bs4 import BeautifulSoup

from app.schemas.scraper import ScrapeResult, ScrapedListing

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
]


class BaseScraper(ABC):
    """Abstract base for all marketplace scrapers.

    Subclasses must implement:
        marketplace: str property (e.g. "ebay")
        display_name: str property (e.g. "eBay")
        scrape(query, condition) -> ScrapeResult
    """

    request_timeout: float = 25.0
    min_delay: float = 1.0
    max_delay: float = 3.0
    max_retries: int = 2
    use_http2: bool = True

    @property
    @abstractmethod
    def marketplace(self) -> str:
        """Internal key matching MARKETPLACE_FEES keys, e.g. 'ebay'."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name, e.g. 'eBay'."""
        ...

    @abstractmethod
    async def scrape(self, query: str, condition: str = "new") -> ScrapeResult:
        """Scrape listings for the given query. Returns ScrapeResult."""
        ...

    # ---- Shared infrastructure ----

    async def _fetch(self, url: str, params: dict | None = None) -> str | None:
        """Fetch a URL with randomized User-Agent, retry, and delay.

        Returns HTML body string, or None on failure.
        """
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
        }

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=self.request_timeout,
                    follow_redirects=True,
                    http2=self.use_http2,
                ) as client:
                    response = await client.get(url, headers=headers, params=params)
                    if response.status_code == 200:
                        return response.text
                    elif response.status_code in (429, 503):
                        wait = (attempt + 1) * 5
                        logger.warning(
                            "%s: HTTP %d, waiting %ds (attempt %d/%d)",
                            self.display_name,
                            response.status_code,
                            wait,
                            attempt + 1,
                            self.max_retries + 1,
                        )
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(
                            "%s: HTTP %d for %s",
                            self.display_name,
                            response.status_code,
                            url,
                        )
                        return None
            except httpx.TimeoutException:
                logger.warning(
                    "%s: timeout on attempt %d/%d",
                    self.display_name,
                    attempt + 1,
                    self.max_retries + 1,
                )
            except httpx.HTTPError as exc:
                logger.warning("%s: HTTP error: %s", self.display_name, exc)
                return None

            await asyncio.sleep(random.uniform(self.min_delay, self.max_delay))

        logger.error("%s: all retries exhausted for %s", self.display_name, url)
        return None

    def _parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML with lxml (fast) or html.parser (fallback)."""
        try:
            return BeautifulSoup(html, "lxml")
        except Exception:
            return BeautifulSoup(html, "html.parser")

    def _empty_result(self, error: str | None = None) -> ScrapeResult:
        """Return an empty ScrapeResult for error/fallback paths."""
        return ScrapeResult(
            marketplace=self.marketplace,
            display_name=self.display_name,
            success=error is None,
            error_message=error,
            scraped_at=datetime.now(timezone.utc),
        )

    def _compute_aggregates(
        self,
        sold_listings: list[ScrapedListing],
        active_listings: list[ScrapedListing],
    ) -> ScrapeResult:
        """Build a ScrapeResult with computed price aggregates."""
        sold_prices = [l.price for l in sold_listings if l.price > 0]
        active_prices = [l.price for l in active_listings if l.price > 0]

        return ScrapeResult(
            marketplace=self.marketplace,
            display_name=self.display_name,
            sold_listings=sold_listings,
            active_listings=active_listings,
            avg_sold_price=round(sum(sold_prices) / len(sold_prices), 2)
            if sold_prices
            else None,
            median_sold_price=round(median(sold_prices), 2)
            if sold_prices
            else None,
            active_listing_price=round(median(active_prices), 2)
            if active_prices
            else None,
            sales_volume=len(sold_prices),
            success=len(sold_prices) > 0 or len(active_prices) > 0,
            error_message=None
            if (sold_prices or active_prices)
            else "No listings found",
            scraped_at=datetime.now(timezone.utc),
        )
