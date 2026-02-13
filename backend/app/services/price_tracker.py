"""Price Tracker service — query price_history and compute trend statistics."""

import logging
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item
from app.models.price_history import PriceHistory
from app.schemas.trends import (
    MarketplaceTrend,
    PricePoint,
    TrendResponse,
    TrendVolume,
)

logger = logging.getLogger(__name__)

PERIOD_DAYS: dict[str, int | None] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
    "all": None,
}


class PriceTrackerService:
    """Query price_history for trend data, grouped by marketplace."""

    async def get_trends(
        self,
        db: AsyncSession,
        item_id: int,
        period: str = "30d",
    ) -> TrendResponse | None:
        """Build a full TrendResponse from price_history rows.

        Returns None if the item doesn't exist.
        """
        # 1. Look up item
        item_result = await db.execute(select(Item).where(Item.id == item_id))
        item = item_result.scalar_one_or_none()
        if item is None:
            return None

        # 2. Determine time window
        days = PERIOD_DAYS.get(period)
        cutoff = datetime.utcnow() - timedelta(days=days) if days else None

        # 3. Query price_history
        stmt = (
            select(PriceHistory)
            .where(PriceHistory.item_id == item_id)
            .order_by(PriceHistory.recorded_at)
        )
        if cutoff is not None:
            stmt = stmt.where(PriceHistory.recorded_at >= cutoff)

        result = await db.execute(stmt)
        rows = list(result.scalars().all())

        # 4. Group by marketplace
        by_marketplace: dict[str, list[PriceHistory]] = defaultdict(list)
        for row in rows:
            by_marketplace[row.marketplace].append(row)

        # 5. Build per-marketplace trend data
        marketplaces: dict[str, MarketplaceTrend] = {}
        all_prices: list[float] = []

        for mp_name, mp_rows in by_marketplace.items():
            prices = [float(r.price) for r in mp_rows]
            all_prices.extend(prices)

            data_points = [
                PricePoint(
                    date=r.recorded_at.isoformat() if r.recorded_at else "",
                    price=float(r.price),
                )
                for r in mp_rows
            ]

            marketplaces[mp_name] = MarketplaceTrend(
                data=data_points,
                current=prices[-1] if prices else 0.0,
                high=max(prices) if prices else 0.0,
                low=min(prices) if prices else 0.0,
                avg=round(sum(prices) / len(prices), 2) if prices else 0.0,
            )

        # 6. Compute overall stats
        if all_prices:
            current_price = all_prices[-1]
            first_price = all_prices[0]
            price_change_pct = round(
                ((current_price - first_price) / first_price) * 100, 1
            ) if first_price != 0 else 0.0
        else:
            current_price = 0.0
            price_change_pct = 0.0

        trend = self._determine_trend(all_prices) if all_prices else "stable"

        # 7. Volume stats
        total_sales = len(rows)
        effective_days = days or max(
            1,
            (datetime.utcnow() - rows[0].recorded_at).days if rows else 1,
        )
        avg_daily = round(total_sales / max(effective_days, 1), 1)

        return TrendResponse(
            item_id=item.id,
            item_name=item.name,
            period=period,
            current_price=current_price,
            price_change_pct=price_change_pct,
            trend=trend,
            marketplaces=marketplaces,
            volume=TrendVolume(
                total_sales_period=total_sales,
                avg_daily_sales=avg_daily,
            ),
        )

    @staticmethod
    def _determine_trend(prices: list[float]) -> str:
        """Classify price direction as rising/falling/stable.

        Compares average of first third vs last third of prices.
        > +5% = rising, < -5% = falling, else stable.
        """
        if len(prices) < 3:
            return "stable"

        third = max(len(prices) // 3, 1)
        first_avg = sum(prices[:third]) / third
        last_avg = sum(prices[-third:]) / third

        if first_avg == 0:
            return "stable"

        change_pct = ((last_avg - first_avg) / first_avg) * 100

        if change_pct > 5:
            return "rising"
        elif change_pct < -5:
            return "falling"
        return "stable"

    async def record_price(
        self,
        db: AsyncSession,
        item_id: int,
        marketplace: str,
        price: float,
        condition: str = "new",
    ) -> None:
        """Insert a single price_history row.

        Used by the analyzer's _persist_prices() and future scheduled tasks.
        Does NOT commit — caller is responsible for committing the session.
        """
        entry = PriceHistory(
            item_id=item_id,
            marketplace=marketplace,
            price=price,
            condition=condition,
        )
        db.add(entry)
        logger.debug(
            "Recorded price: item_id=%d marketplace=%s price=%.2f",
            item_id,
            marketplace,
            price,
        )


price_tracker = PriceTrackerService()
