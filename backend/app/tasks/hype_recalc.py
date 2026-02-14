"""Periodic hype recalculation task — recompute hype scores for all tracked items.

Runs every 6 hours via APScheduler. Iterates over all items that have
price_history data, recomputes their hype score, and persists a new
HypeSnapshot for trend tracking.

Designed to run inside an async context with its own DB session.
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select

logger = logging.getLogger(__name__)


async def run_hype_recalculation() -> None:
    """Recompute hype scores for all items with recent price data.

    Steps:
        1. Find all items with price_history entries (last 90 days)
        2. For each item, compute fresh hype score via HypeScorerService
        3. Each computation persists a new HypeSnapshot automatically
    """
    logger.info("Starting scheduled hype recalculation task")
    start_time = datetime.utcnow()
    items_scored = 0
    errors = 0

    try:
        from app.database import async_session
        from app.models.item import Item
        from app.models.price_history import PriceHistory
        from app.services.hype_scorer import hype_scorer

        async with async_session() as db:
            # Find all items with price data in the last 90 days
            cutoff = datetime.utcnow() - timedelta(days=90)
            stmt = (
                select(Item.id, Item.name)
                .join(PriceHistory, PriceHistory.item_id == Item.id)
                .where(PriceHistory.recorded_at >= cutoff)
                .group_by(Item.id, Item.name)
                .order_by(func.count(PriceHistory.id).desc())
            )
            result = await db.execute(stmt)
            items = list(result.all())

            if not items:
                logger.info("No items with recent price data — skipping hype recalc")
                return

            logger.info(
                "Recomputing hype scores for %d items", len(items)
            )

            for item_id, item_name in items:
                try:
                    # get_hype() computes the score and persists a snapshot
                    hype_result = await hype_scorer.get_hype(db, item_id)
                    if hype_result is not None:
                        items_scored += 1
                        logger.debug(
                            "Hype score for %s (id=%d): %d (%s)",
                            item_name,
                            item_id,
                            hype_result.hype_score,
                            hype_result.trend,
                        )
                except Exception as exc:
                    errors += 1
                    logger.warning(
                        "Error computing hype for item %d (%s): %s",
                        item_id,
                        item_name,
                        exc,
                    )
                    # hype_scorer.get_hype commits its own snapshot,
                    # so individual failures don't block others

    except Exception as exc:
        logger.error("Hype recalculation task failed: %s", exc)
        return

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        "Hype recalculation completed: %d items scored, %d errors, %.1fs elapsed",
        items_scored,
        errors,
        elapsed,
    )
