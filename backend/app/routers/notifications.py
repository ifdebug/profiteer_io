"""Notification system endpoint — returns mock notifications."""

from fastapi import APIRouter

router = APIRouter()

MOCK_NOTIFICATIONS = [
    {
        "id": 1, "type": "price_alert", "title": "Price Drop Alert",
        "message": "Nike Dunk Low Panda dropped to $98 on StockX (your target: $100)",
        "read": False, "timestamp": "2026-02-11T14:30:00Z", "link": "#/trends/5",
    },
    {
        "id": 2, "type": "price_alert", "title": "Target Price Hit",
        "message": "Pokemon 151 Booster Box hit your sell target of $145 on eBay",
        "read": False, "timestamp": "2026-02-11T12:15:00Z", "link": "#/analyzer",
    },
    {
        "id": 3, "type": "shipment", "title": "Package Delivered",
        "message": "Your UPS package to Chicago, IL was delivered at 2:05 PM",
        "read": True, "timestamp": "2026-02-10T14:05:00Z", "link": "#/shipments",
    },
    {
        "id": 4, "type": "arbitrage", "title": "New Arbitrage Opportunity",
        "message": "LEGO AT-AT: Buy at Walmart $159.99, sell on eBay for ~$230. Est. profit: $38",
        "read": True, "timestamp": "2026-02-10T10:00:00Z", "link": "#/arbitrage",
    },
    {
        "id": 5, "type": "deal", "title": "Deal Alert",
        "message": "Target Buy 2 Get 1 Free on trading cards starts today!",
        "read": True, "timestamp": "2026-02-09T08:00:00Z", "link": "#/deals",
    },
    {
        "id": 6, "type": "hype", "title": "Hype Alert",
        "message": "Pokemon Prismatic Evolutions hype score crossed 90 (now 92)",
        "read": False, "timestamp": "2026-02-11T09:00:00Z", "link": "#/hype/1",
    },
    {
        "id": 7, "type": "inventory", "title": "Value Change",
        "message": "Air Jordan 1 Chicago value increased by $25 to $320",
        "read": True, "timestamp": "2026-02-10T22:00:00Z", "link": "#/inventory",
    },
]


@router.get("")
async def get_notifications():
    unread = sum(1 for n in MOCK_NOTIFICATIONS if not n["read"])
    return {
        "notifications": MOCK_NOTIFICATIONS,
        "unread_count": unread,
        "total": len(MOCK_NOTIFICATIONS),
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    return {"success": True, "id": notification_id, "read": True}


@router.put("/read-all")
async def mark_all_read():
    return {"success": True, "message": "All notifications marked as read"}
