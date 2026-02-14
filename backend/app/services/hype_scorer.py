"""Hype Scorer service — computes hype scores from real price_history data.

The hype score (0-100) is a composite of six signals derived from the
item's price history in our database:

  1. Price Velocity (20%)  — How fast the price is changing recently
  2. Volume (25%)          — How many data points recorded (proxy for demand)
  3. Marketplace Spread (10%) — How many marketplaces have data
  4. Price Premium (15%)   — Is current price above historical average
  5. Momentum (20%)        — Is activity accelerating or decelerating
  6. Recency (10%)         — How recent is the latest data point

The score is persisted as a HypeSnapshot for historical tracking.
"""

import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hype_snapshot import HypeSnapshot
from app.models.item import Item
from app.models.price_history import PriceHistory
from app.schemas.hype import (
    HypeHistoryPoint,
    HypeResponse,
    HypeSignals,
    LeaderboardEntry,
    LeaderboardResponse,
)

logger = logging.getLogger(__name__)

# Weights for each signal component (must sum to 1.0)
WEIGHTS = {
    "price_velocity": 0.20,
    "volume": 0.25,
    "marketplace_spread": 0.10,
    "price_premium": 0.15,
    "momentum": 0.20,
    "recency": 0.10,
}


class HypeScorerService:
    """Compute and store hype scores based on price_history data."""

    async def get_hype(
        self,
        db: AsyncSession,
        item_id: int,
    ) -> HypeResponse | None:
        """Compute a fresh hype score for an item and persist a snapshot.

        Returns None if the item doesn't exist.
        """
        # 1. Look up item
        item_result = await db.execute(select(Item).where(Item.id == item_id))
        item = item_result.scalar_one_or_none()
        if item is None:
            return None

        # 2. Fetch all price_history for this item (last 90 days for scoring)
        cutoff_90d = datetime.utcnow() - timedelta(days=90)
        stmt = (
            select(PriceHistory)
            .where(PriceHistory.item_id == item_id)
            .where(PriceHistory.recorded_at >= cutoff_90d)
            .order_by(PriceHistory.recorded_at)
        )
        result = await db.execute(stmt)
        rows = list(result.scalars().all())

        # 3. Compute individual signal scores
        signals = self._compute_signals(rows)

        # 4. Compute weighted overall score
        hype_score = self._weighted_score(signals)

        # 5. Get historical snapshots for trend + chart
        history = await self._get_history(db, item_id)

        # 6. Determine trend from history
        trend = self._determine_trend(history, hype_score)

        # 7. Persist this snapshot
        snapshot = HypeSnapshot(
            item_id=item_id,
            score=hype_score,
            trend=trend,
            price_velocity_score=signals["price_velocity"],
            volume_score=signals["volume"],
            marketplace_spread_score=signals["marketplace_spread"],
            price_premium_score=signals["price_premium"],
            momentum_score=signals["momentum"],
            recency_score=signals["recency"],
            total_data_points=signals["raw_total_points"],
            marketplace_count=signals["raw_marketplace_count"],
            price_change_pct=signals["raw_price_change_pct"],
            avg_daily_volume=signals["raw_avg_daily_volume"],
            recorded_at=datetime.utcnow(),
        )
        db.add(snapshot)
        await db.commit()

        # 8. Build the display signals (mapped from our internal data to the
        #    frontend's expected format — we use our real metrics mapped to
        #    the signal names the frontend expects)
        display_signals = HypeSignals(
            google_trends=int(signals["price_velocity"]),
            reddit_mentions=signals["raw_total_points"],
            twitter_mentions=int(signals["raw_avg_daily_volume"] * 100),
            youtube_videos=signals["raw_marketplace_count"],
            youtube_views=int(abs(signals["raw_price_change_pct"]) * 10000),
            tiktok_views=int(signals["momentum"] * 10000),
        )

        # 9. Build history for chart (include the just-persisted snapshot)
        history_points = await self._get_history_points(db, item_id)

        return HypeResponse(
            item_id=item.id,
            item_name=item.name,
            hype_score=hype_score,
            trend=trend,
            signals=display_signals,
            history=history_points,
        )

    def _compute_signals(
        self, rows: list[PriceHistory]
    ) -> dict[str, float]:
        """Compute all signal scores from price_history rows.

        Each signal is 0-100. Also returns raw values for storage.
        """
        if not rows:
            return {
                "price_velocity": 0.0,
                "volume": 0.0,
                "marketplace_spread": 0.0,
                "price_premium": 0.0,
                "momentum": 0.0,
                "recency": 0.0,
                "raw_total_points": 0,
                "raw_marketplace_count": 0,
                "raw_price_change_pct": 0.0,
                "raw_avg_daily_volume": 0.0,
            }

        prices = [float(r.price) for r in rows]
        now = datetime.utcnow()

        # Group by marketplace
        by_marketplace: dict[str, list[PriceHistory]] = defaultdict(list)
        for r in rows:
            by_marketplace[r.marketplace].append(r)

        # --- 1. Price Velocity (how fast price is changing) ---
        if len(prices) >= 2:
            first_price = prices[0]
            last_price = prices[-1]
            pct_change = ((last_price - first_price) / first_price * 100) if first_price > 0 else 0
            # Map: 0% change → 30, ±50% → 100, scale with sigmoid-like curve
            velocity_raw = min(abs(pct_change) / 50.0 * 100, 100)
            # Bonus for upward movement (more hype-worthy)
            if pct_change > 0:
                velocity_raw = min(velocity_raw * 1.2, 100)
        else:
            pct_change = 0.0
            velocity_raw = 0.0

        # --- 2. Volume (total data points as proxy for activity) ---
        total_points = len(rows)
        # Scale: 1 point = 5, 5 points = 30, 20 points = 70, 50+ = 100
        volume_raw = min(total_points / 50.0 * 100, 100)
        # Apply log curve for diminishing returns
        volume_raw = min(math.log1p(total_points) / math.log1p(50) * 100, 100)

        # --- 3. Marketplace Spread ---
        mp_count = len(by_marketplace)
        # Scale: 1 = 30, 2 = 60, 3+ = 90-100
        spread_raw = min(mp_count / 3.0 * 100, 100)

        # --- 4. Price Premium (current vs average) ---
        avg_price = sum(prices) / len(prices) if prices else 0
        current_price = prices[-1] if prices else 0
        if avg_price > 0:
            premium_pct = ((current_price - avg_price) / avg_price) * 100
            # Positive premium = more hype, map ±30% to 0-100
            premium_raw = max(0, min((premium_pct + 30) / 60 * 100, 100))
        else:
            premium_pct = 0.0
            premium_raw = 50.0  # neutral

        # --- 5. Momentum (is activity accelerating?) ---
        # Compare data points in last 7 days vs previous 7 days
        cutoff_7d = now - timedelta(days=7)
        cutoff_14d = now - timedelta(days=14)
        recent_rows = [r for r in rows if r.recorded_at >= cutoff_7d]
        older_rows = [r for r in rows if cutoff_14d <= r.recorded_at < cutoff_7d]
        recent_count = len(recent_rows)
        older_count = len(older_rows)

        if older_count > 0:
            momentum_ratio = recent_count / older_count
            # >1 = accelerating, <1 = decelerating
            momentum_raw = min(momentum_ratio / 2.0 * 100, 100)
        elif recent_count > 0:
            momentum_raw = 80.0  # new activity with no prior baseline = high momentum
        else:
            momentum_raw = 0.0

        # --- 6. Recency (how recent is the latest data point) ---
        latest_time = rows[-1].recorded_at
        days_since_latest = (now - latest_time).total_seconds() / 86400
        # 0 days = 100, 7 days = 60, 30 days = 20, 90+ days = 0
        recency_raw = max(0, 100 - (days_since_latest / 90) * 100)

        # Days span for avg daily volume
        if len(rows) >= 2:
            days_span = max((rows[-1].recorded_at - rows[0].recorded_at).days, 1)
        else:
            days_span = 1
        avg_daily = round(total_points / days_span, 1)

        return {
            "price_velocity": round(velocity_raw, 1),
            "volume": round(volume_raw, 1),
            "marketplace_spread": round(spread_raw, 1),
            "price_premium": round(premium_raw, 1),
            "momentum": round(momentum_raw, 1),
            "recency": round(recency_raw, 1),
            "raw_total_points": total_points,
            "raw_marketplace_count": mp_count,
            "raw_price_change_pct": round(pct_change, 1) if len(prices) >= 2 else 0.0,
            "raw_avg_daily_volume": avg_daily,
        }

    def _weighted_score(self, signals: dict[str, float]) -> int:
        """Compute the final 0-100 hype score from weighted signal scores."""
        score = (
            signals["price_velocity"] * WEIGHTS["price_velocity"]
            + signals["volume"] * WEIGHTS["volume"]
            + signals["marketplace_spread"] * WEIGHTS["marketplace_spread"]
            + signals["price_premium"] * WEIGHTS["price_premium"]
            + signals["momentum"] * WEIGHTS["momentum"]
            + signals["recency"] * WEIGHTS["recency"]
        )
        return max(0, min(100, round(score)))

    async def _get_history(
        self, db: AsyncSession, item_id: int, limit: int = 30
    ) -> list[HypeSnapshot]:
        """Fetch recent hype snapshots for trend determination."""
        stmt = (
            select(HypeSnapshot)
            .where(HypeSnapshot.item_id == item_id)
            .order_by(desc(HypeSnapshot.recorded_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(reversed(result.scalars().all()))

    async def _get_history_points(
        self, db: AsyncSession, item_id: int, limit: int = 30
    ) -> list[HypeHistoryPoint]:
        """Fetch hype history formatted for the frontend chart."""
        snapshots = await self._get_history(db, item_id, limit)
        return [
            HypeHistoryPoint(
                date=s.recorded_at.strftime("%Y-%m-%d") if s.recorded_at else "",
                score=s.score,
            )
            for s in snapshots
        ]

    def _determine_trend(
        self, history: list[HypeSnapshot], current_score: int
    ) -> str:
        """Classify hype trend based on recent score history.

        - rising: score increasing > 5 points over recent history
        - peaking: score >= 70 and stable/slightly declining
        - stable: score not changing much
        - falling: score decreasing > 5 points over recent history
        - dead: score < 15
        """
        if current_score < 15:
            return "dead"

        if len(history) < 2:
            # No history to compare — classify by absolute score
            if current_score >= 70:
                return "rising"
            elif current_score >= 40:
                return "stable"
            else:
                return "falling"

        # Compare current with average of oldest third of history
        third = max(len(history) // 3, 1)
        old_avg = sum(s.score for s in history[:third]) / third
        diff = current_score - old_avg

        if diff > 5:
            return "rising"
        elif diff < -5:
            if current_score >= 70:
                return "peaking"
            return "falling"
        else:
            if current_score >= 70:
                return "peaking"
            return "stable"

    async def get_leaderboards(
        self,
        db: AsyncSession,
        limit_per_category: int = 5,
    ) -> LeaderboardResponse:
        """Build leaderboards from the latest hype snapshot per item.

        Groups items by their category. Items without a category go into
        an 'uncategorized' bucket.
        """
        # Subquery: latest snapshot per item
        latest_sq = (
            select(
                HypeSnapshot.item_id,
                func.max(HypeSnapshot.id).label("latest_id"),
            )
            .group_by(HypeSnapshot.item_id)
            .subquery()
        )

        stmt = (
            select(
                HypeSnapshot.item_id,
                HypeSnapshot.score,
                HypeSnapshot.trend,
                Item.name,
                Item.category,
            )
            .join(latest_sq, HypeSnapshot.id == latest_sq.c.latest_id)
            .join(Item, Item.id == HypeSnapshot.item_id)
            .order_by(desc(HypeSnapshot.score))
        )

        result = await db.execute(stmt)
        rows = result.all()

        # Group by category
        by_category: dict[str, list[LeaderboardEntry]] = defaultdict(list)
        for row in rows:
            cat = row.category or "uncategorized"
            if len(by_category[cat]) < limit_per_category:
                by_category[cat].append(
                    LeaderboardEntry(
                        item_id=row.item_id,
                        name=row.name,
                        score=row.score,
                        trend=row.trend,
                        category=cat,
                    )
                )

        # If no snapshots exist at all, return empty
        if not by_category:
            return LeaderboardResponse(leaderboards={})

        return LeaderboardResponse(leaderboards=dict(by_category))

    async def search_items(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 10,
    ) -> list[dict]:
        """Search items by name, include latest hype score if available."""
        # Subquery: latest snapshot per item
        latest_sq = (
            select(
                HypeSnapshot.item_id,
                func.max(HypeSnapshot.id).label("latest_id"),
            )
            .group_by(HypeSnapshot.item_id)
            .subquery()
        )

        latest_score_sq = (
            select(
                HypeSnapshot.item_id,
                HypeSnapshot.score.label("latest_score"),
            )
            .join(latest_sq, HypeSnapshot.id == latest_sq.c.latest_id)
            .subquery()
        )

        stmt = (
            select(
                Item.id,
                Item.name,
                Item.category,
                latest_score_sq.c.latest_score,
            )
            .outerjoin(latest_score_sq, Item.id == latest_score_sq.c.item_id)
            .where(Item.name.ilike(f"%{query}%"))
            .order_by(
                desc(latest_score_sq.c.latest_score).nulls_last(),
                Item.name,
            )
            .limit(limit)
        )

        result = await db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": row.id,
                "name": row.name,
                "category": row.category,
                "latest_score": row.latest_score,
            }
            for row in rows
        ]


hype_scorer = HypeScorerService()
