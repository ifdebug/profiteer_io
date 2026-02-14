"""Arbitrage service — finds cross-marketplace price gaps from price_history.

Scans all items that have price data on 2+ marketplaces, identifies
buy-low/sell-high pairs, and computes profit after fees and shipping.

Also supports on-demand scans: run the analyzer scrapers for a query,
then compute arbitrage opportunities from the fresh results.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item
from app.models.price_history import PriceHistory
from app.schemas.arbitrage import (
    ArbitrageOpportunity,
    OpportunitiesResponse,
)
from app.utils.fees import calculate_total_fees
from app.utils.shipping import cheapest_shipping

logger = logging.getLogger(__name__)


class ArbitrageService:
    """Find cross-marketplace arbitrage opportunities from real price data."""

    async def find_opportunities(
        self,
        db: AsyncSession,
        category: str | None = None,
        min_profit: float | None = None,
        sort_by: str = "profit",  # "profit" | "roi" | "margin"
        limit: int = 50,
    ) -> OpportunitiesResponse:
        """Scan price_history for cross-marketplace arbitrage opportunities.

        For each item with data on 2+ marketplaces, computes the best
        buy-low / sell-high pair and returns opportunities sorted by
        estimated profit.
        """
        # 1. Get items with recent price data on 2+ marketplaces (last 30d)
        cutoff = datetime.utcnow() - timedelta(days=30)

        # Subquery: items that have data on multiple marketplaces
        mp_count_sq = (
            select(
                PriceHistory.item_id,
                func.count(func.distinct(PriceHistory.marketplace)).label("mp_count"),
            )
            .where(PriceHistory.recorded_at >= cutoff)
            .group_by(PriceHistory.item_id)
            .having(func.count(func.distinct(PriceHistory.marketplace)) >= 2)
            .subquery()
        )

        # Join with items for category filter
        item_stmt = (
            select(Item)
            .join(mp_count_sq, Item.id == mp_count_sq.c.item_id)
        )
        if category:
            item_stmt = item_stmt.where(Item.category == category)

        result = await db.execute(item_stmt)
        items = list(result.scalars().all())

        if not items:
            # Still return categories for the filter chips
            categories = await self._get_categories(db)
            return OpportunitiesResponse(
                opportunities=[], total=0, categories=categories
            )

        # 2. For each item, get recent prices grouped by marketplace
        opportunities: list[ArbitrageOpportunity] = []

        for item in items:
            price_stmt = (
                select(PriceHistory)
                .where(PriceHistory.item_id == item.id)
                .where(PriceHistory.recorded_at >= cutoff)
                .order_by(desc(PriceHistory.recorded_at))
            )
            price_result = await db.execute(price_stmt)
            rows = list(price_result.scalars().all())

            if len(rows) < 2:
                continue

            # Group by marketplace
            by_mp: dict[str, list[PriceHistory]] = defaultdict(list)
            for row in rows:
                by_mp[row.marketplace].append(row)

            if len(by_mp) < 2:
                continue

            # 3. Compute average price per marketplace
            mp_prices: dict[str, float] = {}
            mp_volumes: dict[str, int] = {}
            for mp, mp_rows in by_mp.items():
                prices = [float(r.price) for r in mp_rows]
                mp_prices[mp] = sum(prices) / len(prices)
                mp_volumes[mp] = len(prices)

            # 4. Find best buy-low / sell-high pair
            sorted_mps = sorted(mp_prices.items(), key=lambda x: x[1])
            buy_mp, buy_price = sorted_mps[0]
            sell_mp, sell_price = sorted_mps[-1]

            if sell_price <= buy_price:
                continue

            # 5. Compute fees and profit
            total_fees = calculate_total_fees(sell_price, sell_mp)
            shipping = cheapest_shipping(16.0)  # default 1 lb
            shipping_cost = shipping["cost"]

            net_profit = sell_price - buy_price - total_fees - shipping_cost
            profit_margin = (net_profit / sell_price * 100) if sell_price > 0 else 0
            roi = (net_profit / buy_price * 100) if buy_price > 0 else 0

            if min_profit is not None and net_profit < min_profit:
                continue

            # 6. Compute risk score (0-100)
            risk = self._compute_risk(
                profit_margin=profit_margin,
                sell_volume=mp_volumes.get(sell_mp, 0),
                buy_volume=mp_volumes.get(buy_mp, 0),
                price_spread_pct=((sell_price - buy_price) / buy_price * 100)
                if buy_price > 0
                else 0,
            )

            # 7. Estimate days to sell (based on sell marketplace volume)
            sell_vol = mp_volumes.get(sell_mp, 1)
            avg_days = max(1, 30 // sell_vol)

            # 8. Confidence level
            if profit_margin >= 15 and risk < 35:
                confidence = "high"
            elif profit_margin >= 5 and risk < 60:
                confidence = "medium"
            else:
                confidence = "low"

            # Map marketplace keys to display names
            mp_display = self._marketplace_display_name

            opportunities.append(
                ArbitrageOpportunity(
                    id=item.id,
                    item_name=item.name,
                    category=item.category,
                    image_url=item.image_url,
                    buy_platform=mp_display(buy_mp),
                    buy_price=round(buy_price, 2),
                    buy_condition="new",
                    sell_platform=mp_display(sell_mp),
                    sell_price=round(sell_price, 2),
                    estimated_fees=round(total_fees, 2),
                    estimated_shipping=round(shipping_cost, 2),
                    estimated_profit=round(net_profit, 2),
                    profit_margin=round(profit_margin, 2),
                    roi=round(roi, 2),
                    risk_score=risk,
                    confidence=confidence,
                    avg_days_to_sell=avg_days,
                )
            )

        # Sort
        sort_key = {
            "profit": lambda o: o.estimated_profit,
            "roi": lambda o: o.roi,
            "margin": lambda o: o.profit_margin,
        }.get(sort_by, lambda o: o.estimated_profit)
        opportunities.sort(key=sort_key, reverse=True)
        opportunities = opportunities[:limit]

        categories = await self._get_categories(db)

        return OpportunitiesResponse(
            opportunities=opportunities,
            total=len(opportunities),
            categories=categories,
        )

    async def scan_and_find(
        self,
        db: AsyncSession,
        query: str,
        purchase_price: float | None = None,
        condition: str = "new",
    ) -> OpportunitiesResponse:
        """Run a fresh scrape for a query, then find arbitrage opportunities.

        This triggers the analyzer scrapers, persists results to
        price_history, then scans for cross-marketplace gaps.
        """
        from app.schemas.analyzer import ProfitabilityRequest
        from app.services.analyzer import analyzer_service

        # Run the analyzer to scrape and persist data
        request = ProfitabilityRequest(
            query=query,
            purchase_price=purchase_price or 0.0,
            condition=condition,
        )
        await analyzer_service.analyze(request, db)

        # Small delay to let fire-and-forget persist complete
        import asyncio
        await asyncio.sleep(1.0)

        # Now find opportunities from the freshly persisted data
        return await self.find_opportunities(db)

    def _compute_risk(
        self,
        profit_margin: float,
        sell_volume: int,
        buy_volume: int,
        price_spread_pct: float,
    ) -> int:
        """Compute a risk score from 0 (safe) to 100 (risky).

        Factors:
        - Low sell volume = higher risk
        - Very large price spread = might be stale/inaccurate data
        - Negative margin = very high risk
        """
        risk = 50  # base risk

        # Volume factor: more data = lower risk
        total_vol = sell_volume + buy_volume
        if total_vol >= 10:
            risk -= 20
        elif total_vol >= 5:
            risk -= 10
        elif total_vol >= 2:
            risk -= 0
        else:
            risk += 15

        # Profit margin factor
        if profit_margin >= 20:
            risk -= 15
        elif profit_margin >= 10:
            risk -= 10
        elif profit_margin >= 5:
            risk -= 5
        elif profit_margin < 0:
            risk += 20

        # Spread factor: extreme spreads may indicate bad data
        if price_spread_pct > 100:
            risk += 15  # suspiciously large gap
        elif price_spread_pct > 50:
            risk += 5

        return max(0, min(100, risk))

    @staticmethod
    def _marketplace_display_name(key: str) -> str:
        """Map marketplace key to human-readable display name."""
        names = {
            "ebay": "eBay",
            "amazon": "Amazon",
            "mercari": "Mercari",
            "stockx": "StockX",
            "tcgplayer": "TCGPlayer",
            "whatnot": "Whatnot",
            "facebook": "Facebook Marketplace",
            "craigslist": "Craigslist",
            "walmart": "Walmart",
            "target": "Target",
            "gamestop": "GameStop",
        }
        return names.get(key.lower(), key.title())

    async def _get_categories(self, db: AsyncSession) -> list[str]:
        """Get distinct categories that have items with price data."""
        stmt = (
            select(func.distinct(Item.category))
            .join(PriceHistory, PriceHistory.item_id == Item.id)
            .where(Item.category.isnot(None))
            .order_by(Item.category)
        )
        result = await db.execute(stmt)
        cats = [r[0] for r in result.all() if r[0]]
        # Always include common categories for the filter UI
        default_cats = ["electronics", "trading_cards", "sneakers", "toys", "collectibles"]
        return sorted(set(cats + default_cats))


arbitrage_service = ArbitrageService()
