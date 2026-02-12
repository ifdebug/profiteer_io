"""Profitability Analyzer endpoint — returns mock marketplace profitability breakdown."""

from fastapi import APIRouter

from app.schemas.analyzer import ProfitabilityRequest, ProfitabilityResponse

router = APIRouter()


@router.post("/analyze", response_model=ProfitabilityResponse)
async def analyze_item(request: ProfitabilityRequest):
    purchase_price = request.purchase_price or 25.00

    return {
        "item_name": request.query or "Pokemon Scarlet & Violet 151 Booster Bundle",
        "item_image": None,
        "purchase_price": purchase_price,
        "best_marketplace": "eBay",
        "best_profit": 28.73,
        "marketplaces": [
            {
                "marketplace": "eBay",
                "avg_sold_price": 74.99,
                "active_listing_price": 79.99,
                "platform_fee": 9.94,
                "payment_processing_fee": 2.73,
                "estimated_shipping": 5.50,
                "packaging_cost": request.packaging_cost,
                "net_profit": 28.73,
                "profit_margin": 38.31,
                "roi": 114.92,
                "sales_volume": 342,
                "profitability": "strong",
            },
            {
                "marketplace": "TCGPlayer",
                "avg_sold_price": 69.99,
                "active_listing_price": 72.50,
                "platform_fee": 7.62,
                "payment_processing_fee": 2.00,
                "estimated_shipping": 4.50,
                "packaging_cost": request.packaging_cost,
                "net_profit": 27.28,
                "profit_margin": 38.97,
                "roi": 109.12,
                "sales_volume": 518,
                "profitability": "strong",
            },
            {
                "marketplace": "Amazon",
                "avg_sold_price": 72.00,
                "active_listing_price": 74.99,
                "platform_fee": 10.80,
                "payment_processing_fee": 0.00,
                "estimated_shipping": 6.00,
                "packaging_cost": request.packaging_cost,
                "net_profit": 26.61,
                "profit_margin": 36.96,
                "roi": 106.44,
                "sales_volume": 203,
                "profitability": "strong",
            },
            {
                "marketplace": "Mercari",
                "avg_sold_price": 65.00,
                "active_listing_price": 68.00,
                "platform_fee": 6.50,
                "payment_processing_fee": 2.39,
                "estimated_shipping": 5.50,
                "packaging_cost": request.packaging_cost,
                "net_profit": 22.02,
                "profit_margin": 33.88,
                "roi": 88.08,
                "sales_volume": 89,
                "profitability": "strong",
            },
            {
                "marketplace": "Facebook Marketplace",
                "avg_sold_price": 55.00,
                "active_listing_price": 60.00,
                "platform_fee": 2.75,
                "payment_processing_fee": 0.00,
                "estimated_shipping": 0.00,
                "packaging_cost": 0.00,
                "net_profit": 27.25,
                "profit_margin": 49.55,
                "roi": 109.00,
                "sales_volume": 45,
                "profitability": "strong",
            },
            {
                "marketplace": "StockX",
                "avg_sold_price": 58.00,
                "active_listing_price": None,
                "platform_fee": 5.51,
                "payment_processing_fee": 1.74,
                "estimated_shipping": 7.00,
                "packaging_cost": request.packaging_cost,
                "net_profit": 14.16,
                "profit_margin": 24.41,
                "roi": 56.64,
                "sales_volume": 12,
                "profitability": "strong",
            },
        ],
    }
