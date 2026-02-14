"""Periodic arbitrage scan task — find cross-marketplace price gaps.

Runs every 30 minutes via APScheduler. Scans all items with multi-marketplace
price data to identify buy-low/sell-high opportunities.

This task uses the ArbitrageService.find_opportunities() method, which
queries price_history for items with data on 2+ marketplaces and computes
profit after fees and shipping.

Results are logged for now; in a future phase they'll trigger notifications
when profitable opportunities are found.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


async def run_arbitrage_scan() -> None:
    """Scan price_history for cross-marketplace arbitrage opportunities.

    Steps:
        1. Call ArbitrageService.find_opportunities() with no filters
        2. Log summary of findings
        3. (Future) Trigger alerts for high-confidence opportunities
    """
    logger.info("Starting scheduled arbitrage scan")
    start_time = datetime.utcnow()

    try:
        from app.database import async_session
        from app.services.arbitrage import arbitrage_service

        async with async_session() as db:
            result = await arbitrage_service.find_opportunities(
                db,
                category=None,
                min_profit=0.0,  # Find all profitable opportunities
                sort_by="profit",
                limit=100,
            )

            total = result.total
            opportunities = result.opportunities

            if total == 0:
                logger.info("Arbitrage scan complete: no opportunities found")
                return

            # Log summary
            high_conf = [o for o in opportunities if o.confidence == "high"]
            med_conf = [o for o in opportunities if o.confidence == "medium"]
            low_conf = [o for o in opportunities if o.confidence == "low"]

            logger.info(
                "Arbitrage scan found %d opportunities: %d high, %d medium, %d low confidence",
                total,
                len(high_conf),
                len(med_conf),
                len(low_conf),
            )

            # Log top 5 opportunities
            for opp in opportunities[:5]:
                logger.info(
                    "  → %s: Buy on %s ($%.2f) → Sell on %s ($%.2f) = $%.2f profit (%.1f%% ROI, %s confidence)",
                    opp.item_name,
                    opp.buy_platform,
                    opp.buy_price,
                    opp.sell_platform,
                    opp.sell_price,
                    opp.estimated_profit,
                    opp.roi,
                    opp.confidence,
                )

            # TODO (Phase 5): Trigger notifications for new high-confidence opportunities
            # For now, we just log them. When the notification system is built,
            # we'll compare against previously seen opportunities and only alert
            # on new ones or significant price changes.

    except Exception as exc:
        logger.error("Arbitrage scan task failed: %s", exc)
        return

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info("Arbitrage scan completed in %.1fs", elapsed)
