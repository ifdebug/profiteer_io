"""Periodic shipment status update task — check carrier tracking for active shipments.

Runs every 30 minutes via APScheduler. Finds all non-delivered shipments
and refreshes their tracking status from the carrier's tracking page.

Only updates shipments that are still in transit (not delivered or expired).
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy import select

logger = logging.getLogger(__name__)

# Only update shipments with these active statuses
ACTIVE_STATUSES = {"label_created", "accepted", "in_transit", "out_for_delivery", "exception"}


async def run_shipment_updates() -> None:
    """Refresh tracking data for all active (non-delivered) shipments.

    Steps:
        1. Query all shipments with active statuses
        2. For each, call carrier_tracker.track() to get latest data
        3. Update status and events in the database
    """
    logger.info("Starting scheduled shipment tracking update")
    start_time = datetime.utcnow()
    updated = 0
    errors = 0

    try:
        from app.database import async_session
        from app.models.shipment import Shipment
        from app.services.carrier_tracker import carrier_tracker

        async with async_session() as db:
            # Find all active (non-delivered) shipments
            stmt = select(Shipment).where(Shipment.status.in_(ACTIVE_STATUSES))
            result = await db.execute(stmt)
            shipments = list(result.scalars().all())

            if not shipments:
                logger.info("No active shipments to update")
                return

            logger.info("Updating tracking for %d active shipments", len(shipments))

            for shipment in shipments:
                try:
                    tracking_data = await carrier_tracker.track(
                        shipment.carrier, shipment.tracking_number
                    )

                    if tracking_data is None:
                        logger.debug(
                            "No tracking data for shipment %d (%s %s)",
                            shipment.id,
                            shipment.carrier,
                            shipment.tracking_number,
                        )
                        continue

                    old_status = shipment.status
                    new_status = tracking_data["status"]

                    shipment.status = new_status
                    shipment.events = tracking_data["events"]
                    if tracking_data.get("estimated_delivery"):
                        # Store as-is for now (string from carrier)
                        pass

                    updated += 1

                    if old_status != new_status:
                        logger.info(
                            "Shipment %d (%s): %s → %s",
                            shipment.id,
                            shipment.tracking_number,
                            old_status,
                            new_status,
                        )

                    # Delay between tracking requests to avoid rate limiting
                    await asyncio.sleep(2.0)

                except Exception as exc:
                    errors += 1
                    logger.warning(
                        "Error updating shipment %d: %s", shipment.id, exc
                    )

            await db.commit()

    except Exception as exc:
        logger.error("Shipment update task failed: %s", exc)
        return

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        "Shipment update completed: %d updated, %d errors, %.1fs elapsed",
        updated,
        errors,
        elapsed,
    )
