"""Periodic price update task — re-scrape tracked items and update price_history.

Runs hourly via APScheduler. Finds all items that have been analyzed (i.e.,
exist in price_history), re-scrapes each one across all marketplaces, and
persists fresh prices.

Designed to run inside an async context with its own DB session so it doesn't
conflict with request-scoped sessions.
"""

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select

logger = logging.getLogger(__name__)


async def run_price_updates() -> None:
    """Re-scrape all tracked items and persist updated prices.

    Steps:
        1. Find all distinct items that have price_history entries (last 7 days)
        2. For each item, run scrapers across all marketplaces
        3. Persist new prices to price_history via PriceTrackerService
    """
    logger.info("Starting scheduled price update task")
    start_time = datetime.utcnow()
    items_updated = 0
    errors = 0

    try:
        from app.database import async_session
        from app.models.item import Item
        from app.models.price_history import PriceHistory
        from app.scrapers import get_all_scrapers
        from app.services.cache import cache_service
        from app.services.price_tracker import price_tracker

        async with async_session() as db:
            # Find items with recent price data (active items worth re-scraping)
            cutoff = datetime.utcnow() - timedelta(days=7)
            stmt = (
                select(Item)
                .join(PriceHistory, PriceHistory.item_id == Item.id)
                .where(PriceHistory.recorded_at >= cutoff)
                .group_by(Item.id)
                .order_by(func.max(PriceHistory.recorded_at).desc())
                .limit(50)  # Cap to avoid overwhelming scrapers
            )
            result = await db.execute(stmt)
            items = list(result.scalars().all())

            if not items:
                logger.info("No active items to update — skipping")
                return

            logger.info("Found %d active items to update prices for", len(items))

            scrapers = get_all_scrapers()

            for item in items:
                try:
                    # Scrape all marketplaces for this item
                    scrape_tasks = []
                    for scraper in scrapers:
                        scrape_tasks.append(
                            _scrape_single(scraper, item.name, "new")
                        )

                    results = await asyncio.gather(*scrape_tasks, return_exceptions=True)

                    # Persist successful results
                    for scrape_result in results:
                        if isinstance(scrape_result, Exception):
                            logger.debug(
                                "Scraper exception for %s: %s", item.name, scrape_result
                            )
                            continue

                        from app.schemas.scraper import ScrapeResult

                        if not isinstance(scrape_result, ScrapeResult):
                            continue
                        if not scrape_result.success or not scrape_result.avg_sold_price:
                            continue

                        await price_tracker.record_price(
                            db,
                            item.id,
                            scrape_result.marketplace,
                            scrape_result.avg_sold_price,
                        )

                    await db.commit()
                    items_updated += 1

                    # Small delay between items to be respectful to scraped sites
                    await asyncio.sleep(2.0)

                except Exception as exc:
                    errors += 1
                    logger.warning(
                        "Error updating prices for item %d (%s): %s",
                        item.id,
                        item.name,
                        exc,
                    )
                    await db.rollback()

    except Exception as exc:
        logger.error("Price update task failed: %s", exc)
        return

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        "Price update task completed: %d items updated, %d errors, %.1fs elapsed",
        items_updated,
        errors,
        elapsed,
    )


async def _scrape_single(scraper, query: str, condition: str):
    """Scrape a single marketplace with cache check.

    Uses the cache layer to avoid redundant scrapes within the TTL window.
    """
    from app.services.cache import cache_service

    # Check cache first
    cached = await cache_service.get(scraper.marketplace, query, condition)
    if cached:
        return cached

    # Cache miss — scrape
    result = await scraper.scrape(query, condition)

    # Cache successful results
    if result.success:
        await cache_service.set(scraper.marketplace, query, condition, result)

    return result
