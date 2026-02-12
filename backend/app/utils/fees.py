"""Marketplace fee calculators for profitability analysis."""


MARKETPLACE_FEES = {
    "ebay": {
        "name": "eBay",
        "seller_fee_pct": 0.1325,
        "payment_processing_pct": 0.0299,
        "payment_processing_flat": 0.49,
    },
    "amazon": {
        "name": "Amazon",
        "seller_fee_pct": 0.15,
        "payment_processing_pct": 0.0,
        "payment_processing_flat": 0.0,
    },
    "mercari": {
        "name": "Mercari",
        "seller_fee_pct": 0.10,
        "payment_processing_pct": 0.029,
        "payment_processing_flat": 0.50,
    },
    "stockx": {
        "name": "StockX",
        "seller_fee_pct": 0.095,
        "payment_processing_pct": 0.03,
        "payment_processing_flat": 0.0,
    },
    "tcgplayer": {
        "name": "TCGPlayer",
        "seller_fee_pct": 0.1089,
        "payment_processing_pct": 0.025,
        "payment_processing_flat": 0.25,
    },
    "whatnot": {
        "name": "Whatnot",
        "seller_fee_pct": 0.099,
        "payment_processing_pct": 0.029,
        "payment_processing_flat": 0.30,
    },
    "facebook": {
        "name": "Facebook Marketplace",
        "seller_fee_pct": 0.05,
        "payment_processing_pct": 0.0,
        "payment_processing_flat": 0.0,
    },
    "craigslist": {
        "name": "Craigslist",
        "seller_fee_pct": 0.0,
        "payment_processing_pct": 0.0,
        "payment_processing_flat": 0.0,
    },
}


def calculate_platform_fee(sale_price: float, marketplace: str) -> float:
    fees = MARKETPLACE_FEES.get(marketplace, MARKETPLACE_FEES["ebay"])
    return round(sale_price * fees["seller_fee_pct"], 2)


def calculate_payment_fee(sale_price: float, marketplace: str) -> float:
    fees = MARKETPLACE_FEES.get(marketplace, MARKETPLACE_FEES["ebay"])
    return round(
        sale_price * fees["payment_processing_pct"]
        + fees["payment_processing_flat"],
        2,
    )


def calculate_total_fees(sale_price: float, marketplace: str) -> float:
    return calculate_platform_fee(sale_price, marketplace) + calculate_payment_fee(
        sale_price, marketplace
    )


def calculate_net_profit(
    sale_price: float,
    purchase_price: float,
    marketplace: str,
    shipping_cost: float = 0.0,
    packaging_cost: float = 1.50,
) -> dict:
    platform_fee = calculate_platform_fee(sale_price, marketplace)
    payment_fee = calculate_payment_fee(sale_price, marketplace)
    total_costs = purchase_price + platform_fee + payment_fee + shipping_cost + packaging_cost
    net_profit = sale_price - total_costs
    profit_margin = (net_profit / sale_price * 100) if sale_price > 0 else 0
    roi = (net_profit / purchase_price * 100) if purchase_price > 0 else 0

    if profit_margin >= 20:
        profitability = "strong"
    elif profit_margin >= 5:
        profitability = "marginal"
    else:
        profitability = "loss"

    return {
        "platform_fee": platform_fee,
        "payment_processing_fee": payment_fee,
        "shipping_cost": shipping_cost,
        "packaging_cost": packaging_cost,
        "total_costs": round(total_costs, 2),
        "net_profit": round(net_profit, 2),
        "profit_margin": round(profit_margin, 2),
        "roi": round(roi, 2),
        "profitability": profitability,
    }
