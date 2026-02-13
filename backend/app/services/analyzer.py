"""Analyzer service — orchestrates scrapers, fees, and shipping into profitability results."""

import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.analyzer import (
    MarketplaceResult,
    ProfitabilityRequest,
    ProfitabilityResponse,
)
from app.schemas.scraper import ScrapeResult
from app.scrapers import get_all_scrapers
from app.scrapers.base import BaseScraper
from app.services.cache import cache_service
from app.utils.fees import calculate_net_profit
from app.utils.shipping import cheapest_shipping

logger = logging.getLogger(__name__)


class AnalyzerService:
    """Orchestrate scraping, fee calculation, and profitability analysis."""

    async def analyze(
        self,
        request: ProfitabilityRequest,
        db: AsyncSession | None = None,
    ) -> ProfitabilityResponse:
        """Run profitability analysis across all marketplaces.

        1. Scrape all marketplaces in parallel (with caching)
        2. Calculate fees and net profit for each
        3. Sort by profitability
        4. Optionally persist prices to DB
        """
        purchase_price = request.purchase_price or 0.0
        condition = request.condition or "new"
        scrapers = get_all_scrapers()

        # Scrape all marketplaces concurrently
        scrape_tasks = [
            self._scrape_with_cache(scraper, request.query, condition)
            for scraper in scrapers
        ]
        scrape_results: list[ScrapeResult] = await asyncio.gather(
            *scrape_tasks, return_exceptions=True
        )

        # Calculate shipping cost
        weight_oz = request.weight_oz or 16.0  # default 1 lb
        shipping = (
            {"cost": request.shipping_cost}
            if request.shipping_cost is not None
            else cheapest_shipping(weight_oz)
        )
        shipping_cost = shipping["cost"]

        # Build marketplace results
        marketplace_results: list[MarketplaceResult] = []

        for result in scrape_results:
            if isinstance(result, Exception):
                logger.warning("Scraper returned exception: %s", result)
                continue
            if not isinstance(result, ScrapeResult):
                continue
            if not result.success:
                logger.info(
                    "Scraper %s failed: %s", result.marketplace, result.error_message
                )
                continue

            # Need at least one price to compute profitability
            sale_price = result.avg_sold_price or result.active_listing_price
            if not sale_price or sale_price <= 0:
                continue

            # Calculate fees and profit
            profit_data = calculate_net_profit(
                sale_price=sale_price,
                purchase_price=purchase_price,
                marketplace=result.marketplace,
                shipping_cost=shipping_cost,
                packaging_cost=request.packaging_cost,
            )

            marketplace_results.append(
                MarketplaceResult(
                    marketplace=result.display_name,
                    avg_sold_price=result.avg_sold_price or 0.0,
                    active_listing_price=result.active_listing_price,
                    platform_fee=profit_data["platform_fee"],
                    payment_processing_fee=profit_data["payment_processing_fee"],
                    estimated_shipping=shipping_cost,
                    packaging_cost=request.packaging_cost,
                    net_profit=profit_data["net_profit"],
                    profit_margin=profit_data["profit_margin"],
                    roi=profit_data["roi"],
                    sales_volume=result.sales_volume or None,
                    profitability=profit_data["profitability"],
                )
            )

        # Sort by net profit descending
        marketplace_results.sort(key=lambda m: m.net_profit, reverse=True)

        # Determine best marketplace
        best = marketplace_results[0] if marketplace_results else None

        response = ProfitabilityResponse(
            item_name=request.query,
            item_image=None,
            purchase_price=purchase_price,
            best_marketplace=best.marketplace if best else "N/A",
            best_profit=best.net_profit if best else 0.0,
            marketplaces=marketplace_results,
        )

        # Fire-and-forget: persist prices to DB (non-blocking, own session)
        if marketplace_results:
            asyncio.create_task(
                self._persist_prices(request.query, scrape_results)
            )

        return response

    async def _scrape_with_cache(
        self,
        scraper: BaseScraper,
        query: str,
        condition: str,
    ) -> ScrapeResult:
        """Check cache first, then scrape if miss."""
        # Try cache
        cached = await cache_service.get(scraper.marketplace, query, condition)
        if cached:
            logger.info("Cache HIT for %s: %s", scraper.marketplace, query)
            return cached

        # Cache miss — scrape
        logger.info("Cache MISS for %s: %s — scraping", scraper.marketplace, query)
        result = await scraper.scrape(query, condition)

        # Cache the result (even failures, to avoid re-scraping)
        if result.success:
            await cache_service.set(scraper.marketplace, query, condition, result)

        return result

    async def _persist_prices(
        self,
        query: str,
        results: list,
    ) -> None:
        """Persist scraped prices to price_history table (best-effort).

        Uses its own DB session to avoid conflicts with the request session.
        Resolves a real item_id via ItemService.find_or_create().
        """
        try:
            from app.database import async_session
            from app.services.item_service import item_service
            from app.services.price_tracker import price_tracker

            async with async_session() as db:
                # Resolve (or create) the item by name
                item = await item_service.find_or_create(db, query)

                for result in results:
                    if isinstance(result, Exception) or not isinstance(result, ScrapeResult):
                        continue
                    if not result.success:
                        continue

                    # Record the average sold price as a price history entry
                    if result.avg_sold_price:
                        await price_tracker.record_price(
                            db,
                            item.id,
                            result.marketplace,
                            result.avg_sold_price,
                        )

                await db.commit()
                logger.info(
                    "Persisted prices for item_id=%d name=%r",
                    item.id,
                    item.name,
                )
        except Exception as exc:
            logger.warning("Failed to persist prices: %s", exc)


# Module-level singleton
analyzer_service = AnalyzerService()
