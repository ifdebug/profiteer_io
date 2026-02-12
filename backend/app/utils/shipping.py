"""Shipping cost estimators by weight and dimensions for major carriers."""

USPS_RATES = {
    "first_class": {"max_oz": 15.99, "base": 3.50, "per_oz": 0.15},
    "priority": {"max_oz": 1120, "base": 8.00, "per_oz": 0.05},
    "priority_flat_small": {"rate": 9.45},
    "priority_flat_medium": {"rate": 16.10},
    "priority_flat_large": {"rate": 22.10},
}

UPS_RATES = {
    "ground": {"base": 9.50, "per_oz": 0.06},
    "3_day_select": {"base": 14.00, "per_oz": 0.08},
    "2nd_day_air": {"base": 20.00, "per_oz": 0.10},
}

FEDEX_RATES = {
    "ground": {"base": 9.75, "per_oz": 0.06},
    "express_saver": {"base": 15.00, "per_oz": 0.09},
    "2day": {"base": 21.00, "per_oz": 0.11},
}


def estimate_usps(weight_oz: float) -> dict:
    if weight_oz <= USPS_RATES["first_class"]["max_oz"]:
        cost = USPS_RATES["first_class"]["base"] + weight_oz * USPS_RATES["first_class"]["per_oz"]
        service = "USPS First Class"
    else:
        cost = USPS_RATES["priority"]["base"] + weight_oz * USPS_RATES["priority"]["per_oz"]
        service = "USPS Priority Mail"
    return {"carrier": "USPS", "service": service, "cost": round(cost, 2)}


def estimate_ups(weight_oz: float) -> dict:
    rate = UPS_RATES["ground"]
    cost = rate["base"] + weight_oz * rate["per_oz"]
    return {"carrier": "UPS", "service": "UPS Ground", "cost": round(cost, 2)}


def estimate_fedex(weight_oz: float) -> dict:
    rate = FEDEX_RATES["ground"]
    cost = rate["base"] + weight_oz * rate["per_oz"]
    return {"carrier": "FedEx", "service": "FedEx Ground", "cost": round(cost, 2)}


def estimate_shipping(weight_oz: float = 16.0) -> list[dict]:
    return sorted(
        [estimate_usps(weight_oz), estimate_ups(weight_oz), estimate_fedex(weight_oz)],
        key=lambda x: x["cost"],
    )


def cheapest_shipping(weight_oz: float = 16.0) -> dict:
    return estimate_shipping(weight_oz)[0]
