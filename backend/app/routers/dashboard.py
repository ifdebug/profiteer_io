"""Dashboard endpoint returning aggregated mock data for the home screen."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def get_dashboard():
    return {
        "profit_summary": {
            "today": 47.82,
            "this_week": 312.45,
            "this_month": 1283.90,
            "trend": "up",
        },
        "inventory_snapshot": {
            "total_items": 47,
            "total_value": 3842.50,
            "total_cost": 2156.30,
            "unrealized_pl": 1686.20,
            "top_items": [
                {"name": "Pokemon Charizard VMAX", "value": 285.00, "pl": 185.00},
                {"name": "Air Jordan 1 Retro High OG", "value": 320.00, "pl": 150.00},
                {"name": "PS5 DualSense Controller", "value": 74.99, "pl": 34.99},
                {"name": "MTG Black Lotus (Proxy)", "value": 45.00, "pl": 30.00},
                {"name": "Nintendo Switch OLED", "value": 349.99, "pl": 29.99},
            ],
        },
        "active_shipments": {
            "total": 8,
            "in_transit": 5,
            "delivered_today": 2,
            "exceptions": 1,
        },
        "hot_arbitrage": [
            {
                "item": "LEGO Star Wars UCS AT-AT",
                "buy_platform": "Walmart",
                "buy_price": 159.99,
                "sell_platform": "eBay",
                "sell_price": 229.99,
                "est_profit": 38.50,
            },
            {
                "item": "Pokemon Scarlet & Violet ETB",
                "buy_platform": "Target",
                "buy_price": 42.99,
                "sell_platform": "TCGPlayer",
                "sell_price": 64.99,
                "est_profit": 12.80,
            },
            {
                "item": "Apple AirPods Pro 2",
                "buy_platform": "Amazon",
                "buy_price": 189.99,
                "sell_platform": "StockX",
                "sell_price": 234.00,
                "est_profit": 18.20,
            },
        ],
        "recent_alerts": [
            {
                "type": "price_drop",
                "item": "Nike Dunk Low Panda",
                "message": "Price dropped to $98 on StockX",
                "timestamp": "2026-02-11T14:30:00Z",
            },
            {
                "type": "price_target",
                "item": "Pokemon 151 Booster Box",
                "message": "Hit your target sell price of $145",
                "timestamp": "2026-02-11T12:15:00Z",
            },
        ],
        "trending_hype": [
            {"name": "Pokemon Prismatic Evolutions", "hype_score": 92, "trend": "rising"},
            {"name": "Nike Air Max Dn", "hype_score": 78, "trend": "peaking"},
            {"name": "Yu-Gi-Oh! 25th Anniversary", "hype_score": 65, "trend": "stable"},
        ],
        "recent_activity": [
            {"action": "sold", "item": "PS5 Controller - Blue", "detail": "$65.00 on eBay", "timestamp": "2026-02-11T15:22:00Z"},
            {"action": "listed", "item": "MTG Modern Horizons 3 Box", "detail": "Listed on TCGPlayer", "timestamp": "2026-02-11T13:10:00Z"},
            {"action": "purchased", "item": "LEGO Technic Ferrari", "detail": "$89.99 from Target", "timestamp": "2026-02-11T10:45:00Z"},
            {"action": "price_change", "item": "Air Jordan 4 Thunder", "detail": "Value up $15 to $245", "timestamp": "2026-02-10T22:00:00Z"},
            {"action": "delivered", "item": "Nintendo Switch Game Lot", "detail": "Delivered to buyer", "timestamp": "2026-02-10T18:30:00Z"},
        ],
    }
