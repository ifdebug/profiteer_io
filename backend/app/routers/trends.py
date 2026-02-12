"""Price Trend Tracker endpoint — returns mock price history data."""

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Query

router = APIRouter()


def _generate_price_series(base_price: float, days: int, volatility: float = 0.05):
    """Generate realistic mock price data points."""
    points = []
    price = base_price
    now = datetime.utcnow()
    for i in range(days):
        change = random.uniform(-volatility, volatility) * price
        price = max(price + change, base_price * 0.5)
        points.append({
            "date": (now - timedelta(days=days - i)).isoformat(),
            "price": round(price, 2),
        })
    return points


@router.get("/{item_id}")
async def get_trends(
    item_id: int,
    period: str = Query("30d", regex="^(7d|30d|90d|1y|all)$"),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365, "all": 730}
    days = days_map.get(period, 30)

    random.seed(item_id)

    return {
        "item_id": item_id,
        "item_name": "Pokemon Scarlet & Violet 151 Booster Bundle",
        "period": period,
        "current_price": 74.99,
        "price_change_pct": 12.5,
        "trend": "rising",
        "marketplaces": {
            "eBay": {
                "data": _generate_price_series(72.00, days, 0.04),
                "current": 74.99,
                "high": 82.00,
                "low": 58.00,
                "avg": 71.50,
            },
            "TCGPlayer": {
                "data": _generate_price_series(68.00, days, 0.05),
                "current": 69.99,
                "high": 78.00,
                "low": 55.00,
                "avg": 67.20,
            },
            "Amazon": {
                "data": _generate_price_series(75.00, days, 0.03),
                "current": 72.00,
                "high": 84.99,
                "low": 65.00,
                "avg": 74.30,
            },
            "Mercari": {
                "data": _generate_price_series(62.00, days, 0.06),
                "current": 65.00,
                "high": 72.00,
                "low": 48.00,
                "avg": 61.80,
            },
        },
        "volume": {
            "total_sales_period": 1247,
            "avg_daily_sales": round(1247 / days, 1),
        },
    }
