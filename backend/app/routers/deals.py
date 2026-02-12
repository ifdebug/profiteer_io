"""Deals & Coupons Tracker endpoint — returns mock retail deals."""

from fastapi import APIRouter, Query

router = APIRouter()

MOCK_DEALS = [
    {
        "id": 1, "retailer": "Walmart", "title": "LEGO Star Wars Sets - 30% Off Clearance",
        "description": "Select LEGO Star Wars sets marked down 30% in-store clearance.",
        "url": None, "original_price": 159.99, "deal_price": 111.99, "discount_pct": 30.0,
        "category": "toys", "start_date": "2026-02-10", "end_date": "2026-02-17",
        "upvotes": 142, "downvotes": 8, "profit_potential": 38.50,
    },
    {
        "id": 2, "retailer": "Target", "title": "Buy 2 Get 1 Free on Trading Card Products",
        "description": "Mix and match Pokemon, MTG, and Yu-Gi-Oh! products.",
        "url": None, "original_price": None, "deal_price": 0.0, "discount_pct": 33.33,
        "category": "trading_cards", "start_date": "2026-02-09", "end_date": "2026-02-15",
        "upvotes": 256, "downvotes": 12, "profit_potential": 15.00,
    },
    {
        "id": 3, "retailer": "Best Buy", "title": "Open-Box PS5 DualSense Controllers $39.99",
        "description": "Open-box excellent condition DualSense controllers at deep discount.",
        "url": None, "original_price": 74.99, "deal_price": 39.99, "discount_pct": 46.7,
        "category": "electronics", "start_date": "2026-02-11", "end_date": None,
        "upvotes": 89, "downvotes": 5, "profit_potential": 22.00,
    },
    {
        "id": 4, "retailer": "Amazon", "title": "Lightning Deal: Funko Pop Bundles Under $20",
        "description": "Various 3-pack Funko Pop bundles at lightning deal pricing.",
        "url": None, "original_price": 35.97, "deal_price": 19.99, "discount_pct": 44.4,
        "category": "collectibles", "start_date": "2026-02-11", "end_date": "2026-02-11",
        "upvotes": 67, "downvotes": 22, "profit_potential": 8.50,
    },
    {
        "id": 5, "retailer": "GameStop", "title": "Pre-Owned Game 4 for $20 Sale",
        "description": "Select pre-owned games priced $9.99 and under, get 4 for $20.",
        "url": None, "original_price": 39.96, "deal_price": 20.00, "discount_pct": 50.0,
        "category": "electronics", "start_date": "2026-02-08", "end_date": "2026-02-14",
        "upvotes": 45, "downvotes": 15, "profit_potential": 5.00,
    },
    {
        "id": 6, "retailer": "Costco", "title": "Apple AirPods Pro 2 - Members Only $179.99",
        "description": "Costco member exclusive price on AirPods Pro 2nd Generation.",
        "url": None, "original_price": 249.99, "deal_price": 179.99, "discount_pct": 28.0,
        "category": "electronics", "start_date": "2026-02-01", "end_date": "2026-02-28",
        "upvotes": 198, "downvotes": 3, "profit_potential": 25.00,
    },
]

UPCOMING_EVENTS = [
    {"name": "Presidents Day Sales", "date": "2026-02-16", "retailers": ["Walmart", "Target", "Best Buy", "Home Depot"]},
    {"name": "Amazon Spring Sale", "date": "2026-03-15", "retailers": ["Amazon"]},
    {"name": "Target Circle Week", "date": "2026-04-06", "retailers": ["Target"]},
    {"name": "Prime Day (Expected)", "date": "2026-07-15", "retailers": ["Amazon"]},
    {"name": "Back to School Sales", "date": "2026-08-01", "retailers": ["Walmart", "Target", "Best Buy", "Staples"]},
]


@router.get("")
async def get_deals(
    category: str | None = Query(None),
    retailer: str | None = Query(None),
):
    results = MOCK_DEALS
    if category:
        results = [d for d in results if d["category"] == category]
    if retailer:
        results = [d for d in results if d["retailer"].lower() == retailer.lower()]
    return {
        "deals": results,
        "total": len(results),
        "upcoming_events": UPCOMING_EVENTS,
        "categories": ["electronics", "trading_cards", "toys", "collectibles", "sneakers"],
        "retailers": ["Walmart", "Target", "Amazon", "Best Buy", "GameStop", "Costco"],
    }
