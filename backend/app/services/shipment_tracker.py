"""Shipment Tracker service — CRUD + carrier auto-detection + tracking updates.

Provides full CRUD for shipments in PostgreSQL and carrier auto-detection
from tracking number format. Tracking status updates are provided by the
carrier scraper service (carrier_tracker.py).

All operations are scoped to user_id (hardcoded to 1 until auth is built).
"""

import logging
import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.shipment import (
    ShipmentCreate,
    ShipmentEvent,
    ShipmentResponse,
    ShipmentSummary,
    ShipmentSummaryStats,
)

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = 1

# Carrier detection patterns
CARRIER_PATTERNS = [
    # USPS: 20-22 digits starting with 94/92/93, or 13 chars starting with letters
    (r"^(94|93|92|91|90|82|70)\d{18,22}$", "USPS"),
    (r"^[A-Z]{2}\d{9}[A-Z]{2}$", "USPS"),       # International (e.g., EJ123456789US)
    # UPS: starts with 1Z, followed by alphanumeric
    (r"^1Z[A-Z0-9]{16}$", "UPS"),
    (r"^T\d{10}$", "UPS"),                        # UPS freight
    # FedEx: 12 or 15 digits, or 20-22 digits
    (r"^\d{12}$", "FedEx"),
    (r"^\d{15}$", "FedEx"),
    (r"^\d{20,22}$", "FedEx"),
    # DHL: 10 digits or starts with JD/JJD
    (r"^\d{10}$", "DHL"),
    (r"^JD\d{18}$", "DHL"),
    (r"^JJD\d{19}$", "DHL"),
]


def detect_carrier(tracking_number: str) -> str | None:
    """Auto-detect carrier from tracking number format.

    Returns carrier name (USPS, UPS, FedEx, DHL) or None if unrecognized.
    """
    clean = tracking_number.strip().upper()
    for pattern, carrier in CARRIER_PATTERNS:
        if re.match(pattern, clean):
            return carrier
    return None


class ShipmentService:
    """Full CRUD for shipments with carrier detection and tracking."""

    async def _ensure_default_user(self, db: AsyncSession) -> int:
        """Auto-create a default user if none exists."""
        result = await db.execute(select(User).where(User.id == DEFAULT_USER_ID))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=DEFAULT_USER_ID,
                email="default@profiteer.io",
                username="default",
                hashed_password="not-a-real-hash",
            )
            db.add(user)
            await db.commit()
            logger.info("Created default user (id=%d)", DEFAULT_USER_ID)
        return DEFAULT_USER_ID

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_all(
        self,
        db: AsyncSession,
        user_id: int = DEFAULT_USER_ID,
        status: str | None = None,
    ) -> ShipmentSummary:
        """Return all shipments + summary stats for a user."""
        stmt = (
            select(Shipment)
            .where(Shipment.user_id == user_id)
            .order_by(Shipment.id.desc())
        )
        if status:
            stmt = stmt.where(Shipment.status == status)

        result = await db.execute(stmt)
        rows = list(result.scalars().all())

        shipments = [self._to_response(row) for row in rows]

        summary = ShipmentSummaryStats(
            total=len(rows),
            label_created=sum(1 for r in rows if r.status == "label_created"),
            in_transit=sum(1 for r in rows if r.status == "in_transit"),
            out_for_delivery=sum(1 for r in rows if r.status == "out_for_delivery"),
            delivered=sum(1 for r in rows if r.status == "delivered"),
            exception=sum(1 for r in rows if r.status == "exception"),
        )

        return ShipmentSummary(shipments=shipments, summary=summary)

    async def get_by_id(
        self,
        db: AsyncSession,
        shipment_id: int,
        user_id: int = DEFAULT_USER_ID,
    ) -> ShipmentResponse | None:
        """Return a single shipment, scoped to user."""
        stmt = select(Shipment).where(
            Shipment.id == shipment_id,
            Shipment.user_id == user_id,
        )
        result = await db.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return self._to_response(row)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create(
        self,
        db: AsyncSession,
        data: ShipmentCreate,
        user_id: int = DEFAULT_USER_ID,
    ) -> ShipmentResponse:
        """Create a new shipment with carrier auto-detection."""
        await self._ensure_default_user(db)

        # Auto-detect carrier if not provided
        carrier = data.carrier
        if not carrier or carrier.lower() == "auto":
            detected = detect_carrier(data.tracking_number)
            carrier = detected or "Other"

        # Create initial event
        initial_event = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "label_created",
            "location": data.origin or "",
            "description": "Tracking number added to Profiteer.io",
        }

        shipment = Shipment(
            user_id=user_id,
            tracking_number=data.tracking_number.strip(),
            carrier=carrier,
            status="label_created",
            origin=data.origin,
            destination=data.destination,
            items=data.items,
            events=[initial_event],
        )
        db.add(shipment)
        await db.commit()
        await db.refresh(shipment)
        logger.info(
            "Created shipment id=%d carrier=%s tracking=%s",
            shipment.id,
            carrier,
            shipment.tracking_number,
        )
        return self._to_response(shipment)

    async def update_tracking(
        self,
        db: AsyncSession,
        shipment_id: int,
        new_status: str,
        events: list[dict],
        estimated_delivery: datetime | None = None,
    ) -> ShipmentResponse | None:
        """Update shipment status and events from carrier tracking data.

        Called by the background tracking updater.
        """
        stmt = select(Shipment).where(Shipment.id == shipment_id)
        result = await db.execute(stmt)
        shipment = result.scalar_one_or_none()
        if shipment is None:
            return None

        shipment.status = new_status
        shipment.events = events
        if estimated_delivery:
            shipment.estimated_delivery = estimated_delivery

        await db.commit()
        await db.refresh(shipment)
        logger.info(
            "Updated shipment id=%d status=%s events=%d",
            shipment.id,
            new_status,
            len(events),
        )
        return self._to_response(shipment)

    async def delete(
        self,
        db: AsyncSession,
        shipment_id: int,
        user_id: int = DEFAULT_USER_ID,
    ) -> bool:
        """Delete a shipment. Returns False if not found."""
        stmt = select(Shipment).where(
            Shipment.id == shipment_id,
            Shipment.user_id == user_id,
        )
        result = await db.execute(stmt)
        shipment = result.scalar_one_or_none()
        if shipment is None:
            return False

        await db.delete(shipment)
        await db.commit()
        logger.info("Deleted shipment id=%d", shipment_id)
        return True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_response(row: Shipment) -> ShipmentResponse:
        """Convert SQLAlchemy model to Pydantic response."""
        events = []
        if row.events:
            for ev in row.events:
                events.append(
                    ShipmentEvent(
                        timestamp=ev.get("timestamp", ""),
                        status=ev.get("status", ""),
                        location=ev.get("location"),
                        description=ev.get("description", ""),
                    )
                )

        return ShipmentResponse(
            id=row.id,
            user_id=row.user_id,
            tracking_number=row.tracking_number,
            carrier=row.carrier,
            status=row.status,
            origin=row.origin,
            destination=row.destination,
            estimated_delivery=row.estimated_delivery,
            events=events,
            items=row.items,
            created_at=row.created_at,
        )


shipment_service = ShipmentService()
