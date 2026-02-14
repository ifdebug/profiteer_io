"""Periodic alert check task — evaluate price/hype alert thresholds.

Runs every 15 minutes via APScheduler. Checks all active alerts against
current price data and hype scores, and triggers notifications when
thresholds are crossed.

Note: This is a placeholder for Phase 5 (Notification System). Currently
logs which alerts would fire. The actual notification dispatch will be
implemented when the notification service is built.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


async def run_alert_checks() -> None:
    """Check all active alerts and trigger notifications for threshold crossings.

    Steps:
        1. Fetch all active alerts from the database
        2. For each alert, check current price/hype against threshold
        3. Log alerts that would fire
        4. (Future) Dispatch notifications via NotificationService
    """
    logger.info("Starting scheduled alert check")
    start_time = datetime.utcnow()
    alerts_checked = 0
    alerts_triggered = 0

    try:
        from app.database import async_session
        from app.models.alert import Alert
        from app.models.price_history import PriceHistory

        from sqlalchemy import desc, select

        async with async_session() as db:
            # Fetch all active alerts
            stmt = select(Alert).where(Alert.is_active.is_(True))
            result = await db.execute(stmt)
            alerts = list(result.scalars().all())

            if not alerts:
                logger.info("No active alerts to check")
                return

            logger.info("Checking %d active alerts", len(alerts))

            for alert in alerts:
                try:
                    alerts_checked += 1

                    if alert.alert_type == "price_drop":
                        # Check if current price dropped below threshold
                        price_stmt = (
                            select(PriceHistory.price)
                            .where(PriceHistory.item_id == alert.item_id)
                            .order_by(desc(PriceHistory.recorded_at))
                            .limit(1)
                        )
                        price_result = await db.execute(price_stmt)
                        row = price_result.first()

                        if row and float(row.price) <= float(alert.threshold_value):
                            alerts_triggered += 1
                            logger.info(
                                "ALERT TRIGGERED: item_id=%d price_drop — "
                                "current $%.2f <= threshold $%.2f",
                                alert.item_id,
                                float(row.price),
                                float(alert.threshold_value),
                            )
                            # Update last_triggered timestamp
                            alert.last_triggered = datetime.utcnow()

                    elif alert.alert_type == "price_rise":
                        # Check if price rose above threshold
                        price_stmt = (
                            select(PriceHistory.price)
                            .where(PriceHistory.item_id == alert.item_id)
                            .order_by(desc(PriceHistory.recorded_at))
                            .limit(1)
                        )
                        price_result = await db.execute(price_stmt)
                        row = price_result.first()

                        if row and float(row.price) >= float(alert.threshold_value):
                            alerts_triggered += 1
                            logger.info(
                                "ALERT TRIGGERED: item_id=%d price_rise — "
                                "current $%.2f >= threshold $%.2f",
                                alert.item_id,
                                float(row.price),
                                float(alert.threshold_value),
                            )
                            alert.last_triggered = datetime.utcnow()

                    elif alert.alert_type == "hype_threshold":
                        # Check if hype score crossed threshold
                        from app.models.hype_snapshot import HypeSnapshot

                        hype_stmt = (
                            select(HypeSnapshot.score)
                            .where(HypeSnapshot.item_id == alert.item_id)
                            .order_by(desc(HypeSnapshot.recorded_at))
                            .limit(1)
                        )
                        hype_result = await db.execute(hype_stmt)
                        row = hype_result.first()

                        if row and row.score >= int(alert.threshold_value):
                            alerts_triggered += 1
                            logger.info(
                                "ALERT TRIGGERED: item_id=%d hype_threshold — "
                                "score %d >= threshold %d",
                                alert.item_id,
                                row.score,
                                int(alert.threshold_value),
                            )
                            alert.last_triggered = datetime.utcnow()

                except Exception as exc:
                    logger.warning(
                        "Error checking alert id=%d: %s", alert.id, exc
                    )

            # Commit any updated last_triggered timestamps
            await db.commit()

    except Exception as exc:
        logger.error("Alert check task failed: %s", exc)
        return

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        "Alert check completed: %d checked, %d triggered, %.1fs elapsed",
        alerts_checked,
        alerts_triggered,
        elapsed,
    )
