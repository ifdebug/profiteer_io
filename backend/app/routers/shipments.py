"""Shipment Tracker endpoints — CRUD with carrier auto-detection and tracking."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.shipment import (
    ShipmentCreate,
    ShipmentResponse,
    ShipmentSummary,
)
from app.services.shipment_tracker import shipment_service

router = APIRouter()


@router.get("", response_model=ShipmentSummary)
async def get_shipments(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all shipments with summary stats."""
    return await shipment_service.get_all(db, status=status)


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single shipment with full event timeline."""
    result = await shipment_service.get_by_id(db, shipment_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return result


@router.post("", response_model=ShipmentResponse, status_code=201)
async def create_shipment(
    data: ShipmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a new shipment with carrier auto-detection.

    If carrier is omitted or set to "auto", the carrier will be detected
    from the tracking number format.

    After creation, a background task attempts to fetch initial tracking
    data from the carrier's tracking page.
    """
    shipment = await shipment_service.create(db, data)

    # Fire-and-forget: fetch initial tracking data
    asyncio.create_task(_fetch_initial_tracking(shipment.id))

    return shipment


@router.delete("/{shipment_id}")
async def delete_shipment(
    shipment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a shipment."""
    deleted = await shipment_service.delete(db, shipment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return {"success": True, "message": f"Shipment {shipment_id} deleted"}


@router.post("/{shipment_id}/refresh", response_model=ShipmentResponse)
async def refresh_tracking(
    shipment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Manually refresh tracking data for a shipment from the carrier."""
    shipment = await shipment_service.get_by_id(db, shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")

    from app.services.carrier_tracker import carrier_tracker

    tracking_data = await carrier_tracker.track(
        shipment.carrier, shipment.tracking_number
    )

    if tracking_data is None:
        # Carrier tracking unavailable — return current data unchanged
        return shipment

    updated = await shipment_service.update_tracking(
        db,
        shipment_id=shipment.id,
        new_status=tracking_data["status"],
        events=tracking_data["events"],
        estimated_delivery=None,  # Parsed from tracking_data if available
    )
    return updated or shipment


async def _fetch_initial_tracking(shipment_id: int) -> None:
    """Background task to fetch tracking data right after a shipment is created."""
    try:
        # Small delay to let the DB commit settle
        import asyncio
        await asyncio.sleep(1.0)

        from app.database import async_session
        from app.services.carrier_tracker import carrier_tracker

        async with async_session() as db:
            from app.models.shipment import Shipment
            from sqlalchemy import select

            result = await db.execute(
                select(Shipment).where(Shipment.id == shipment_id)
            )
            shipment = result.scalar_one_or_none()
            if shipment is None:
                return

            tracking_data = await carrier_tracker.track(
                shipment.carrier, shipment.tracking_number
            )
            if tracking_data is None:
                return

            shipment.status = tracking_data["status"]
            shipment.events = tracking_data["events"]
            await db.commit()

    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "Failed to fetch initial tracking for shipment %d: %s",
            shipment_id,
            exc,
        )
