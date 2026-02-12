"""Arbitrage Opportunity Finder endpoint — returns mock cross-platform deals."""

from fastapi import APIRouter, Query

router = APIRouter()

MOCK_OPPORTUNITIES = [
    {
        "id": 1,
        "item_name": "LEGO Star Wars UCS AT-AT 75313",
        "category": "toys",
        "image_url": None,
        "buy_platform": "Walmart",
        "buy_price": 159.99,
        "buy_condition": "new",
        "sell_platform": "eBay",
        "sell_price": 229.99,
        "estimated_fees": 35.49,
        "estimated_shipping": 12.00,
        "estimated_profit": 22.51,
        "profit_margin": 9.79,
        "roi": 14.07,
        "risk_score": 25,
        "confidence": "high",
        "avg_days_to_sell": 5,
    },
    {
        "id": 2,
        "item_name": "Pokemon Prismatic Evolutions Elite Trainer Box",
        "category": "trading_cards",
        "image_url": None,
        "buy_platform": "Target",
        "buy_price": 49.99,
        "buy_condition": "new",
        "sell_platform": "eBay",
        "sell_price": 89.99,
        "estimated_fees": 14.24,
        "estimated_shipping": 5.50,
        "estimated_profit": 18.76,
        "profit_margin": 20.85,
        "roi": 37.53,
        "risk_score": 15,
        "confidence": "high",
        "avg_days_to_sell": 2,
    },
    {
        "id": 3,
        "item_name": "Nike Dunk Low Retro White Black",
        "category": "sneakers",
        "image_url": None,
        "buy_platform": "Nike.com",
        "buy_price": 110.00,
        "buy_condition": "new",
        "sell_platform": "StockX",
        "sell_price": 145.00,
        "estimated_fees": 17.69,
        "estimated_shipping": 8.00,
        "estimated_profit": 7.81,
        "profit_margin": 5.39,
        "roi": 7.10,
        "risk_score": 45,
        "confidence": "medium",
        "avg_days_to_sell": 8,
    },
    {
        "id": 4,
        "item_name": "Apple AirPods Pro 2nd Gen",
        "category": "electronics",
        "image_url": None,
        "buy_platform": "Amazon",
        "buy_price": 189.99,
        "buy_condition": "new",
        "sell_platform": "Mercari",
        "sell_price": 229.00,
        "estimated_fees": 27.33,
        "estimated_shipping": 6.00,
        "estimated_profit": 4.18,
        "profit_margin": 1.83,
        "roi": 2.20,
        "risk_score": 60,
        "confidence": "low",
        "avg_days_to_sell": 12,
    },
    {
        "id": 5,
        "item_name": "Yu-Gi-Oh! 25th Anniversary Rarity Collection II",
        "category": "trading_cards",
        "image_url": None,
        "buy_platform": "GameStop",
        "buy_price": 29.99,
        "buy_condition": "new",
        "sell_platform": "TCGPlayer",
        "sell_price": 54.99,
        "estimated_fees": 7.48,
        "estimated_shipping": 4.00,
        "estimated_profit": 12.02,
        "profit_margin": 21.86,
        "roi": 40.08,
        "risk_score": 20,
        "confidence": "high",
        "avg_days_to_sell": 3,
    },
    {
        "id": 6,
        "item_name": "Hot Wheels Monster Trucks Live Mega-Wrex",
        "category": "toys",
        "image_url": None,
        "buy_platform": "Walmart",
        "buy_price": 12.97,
        "buy_condition": "new",
        "sell_platform": "eBay",
        "sell_price": 34.99,
        "estimated_fees": 5.67,
        "estimated_shipping": 5.50,
        "estimated_profit": 9.35,
        "profit_margin": 26.72,
        "roi": 72.09,
        "risk_score": 30,
        "confidence": "high",
        "avg_days_to_sell": 7,
    },
]


@router.get("/opportunities")
async def get_opportunities(
    category: str | None = Query(None),
    min_profit: float | None = Query(None),
    condition: str | None = Query(None),
):
    results = MOCK_OPPORTUNITIES
    if category:
        results = [o for o in results if o["category"] == category]
    if min_profit:
        results = [o for o in results if o["estimated_profit"] >= min_profit]
    if condition:
        results = [o for o in results if o["buy_condition"] == condition]
    return {
        "opportunities": results,
        "total": len(results),
        "categories": ["electronics", "trading_cards", "sneakers", "toys", "collectibles"],
    }
