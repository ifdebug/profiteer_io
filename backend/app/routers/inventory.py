"""Inventory Manager endpoints — full CRUD with mock data."""

from fastapi import APIRouter

from app.schemas.inventory import InventoryItemCreate, InventoryItemUpdate

router = APIRouter()

MOCK_INVENTORY = [
    {
        "id": 1, "name": "Pokemon Charizard VMAX 020/189", "purchase_price": 100.00,
        "purchase_date": "2026-01-15", "purchase_source": "Local Card Shop",
        "condition": "near_mint", "quantity": 1, "listing_status": "listed",
        "storage_location": "Binder A - Page 12", "notes": "PSA 9 potential",
        "current_value": 285.00, "profit_loss": 185.00,
    },
    {
        "id": 2, "name": "Air Jordan 1 Retro High OG Chicago", "purchase_price": 170.00,
        "purchase_date": "2026-01-20", "purchase_source": "Nike SNKRS",
        "condition": "new", "quantity": 1, "listing_status": "unlisted",
        "storage_location": "Shoe Shelf - Row 2", "notes": "Size 10.5, DS",
        "current_value": 320.00, "profit_loss": 150.00,
    },
    {
        "id": 3, "name": "PS5 DualSense Wireless Controller", "purchase_price": 40.00,
        "purchase_date": "2026-02-01", "purchase_source": "Walmart Clearance",
        "condition": "new", "quantity": 3, "listing_status": "listed",
        "storage_location": "Shelf B", "notes": "Clearance find - $40 each",
        "current_value": 74.99, "profit_loss": 34.99,
    },
    {
        "id": 4, "name": "MTG Modern Horizons 3 Collector Box", "purchase_price": 220.00,
        "purchase_date": "2026-02-05", "purchase_source": "Amazon",
        "condition": "new", "quantity": 1, "listing_status": "listed",
        "storage_location": "Card Storage Box 3", "notes": None,
        "current_value": 265.00, "profit_loss": 45.00,
    },
    {
        "id": 5, "name": "Nintendo Switch OLED - White", "purchase_price": 320.00,
        "purchase_date": "2026-01-28", "purchase_source": "Best Buy",
        "condition": "new", "quantity": 1, "listing_status": "sold",
        "storage_location": None, "notes": "Sold on eBay for $349.99",
        "current_value": 349.99, "profit_loss": 29.99,
    },
    {
        "id": 6, "name": "LEGO Technic Ferrari Daytona SP3", "purchase_price": 89.99,
        "purchase_date": "2026-02-11", "purchase_source": "Target",
        "condition": "new", "quantity": 2, "listing_status": "unlisted",
        "storage_location": "Shelf C", "notes": "Clearance pickup",
        "current_value": 125.00, "profit_loss": 35.01,
    },
]


@router.get("")
async def get_inventory():
    active = [i for i in MOCK_INVENTORY if i["listing_status"] != "sold"]
    total_value = sum(i["current_value"] or 0 for i in active)
    total_cost = sum(i["purchase_price"] * i["quantity"] for i in active)
    return {
        "items": MOCK_INVENTORY,
        "summary": {
            "total_items": sum(i["quantity"] for i in active),
            "total_value": round(total_value, 2),
            "total_cost": round(total_cost, 2),
            "unrealized_pl": round(total_value - total_cost, 2),
        },
    }


@router.get("/{item_id}")
async def get_inventory_item(item_id: int):
    for item in MOCK_INVENTORY:
        if item["id"] == item_id:
            return item
    return {"error": "Item not found"}


@router.post("")
async def create_inventory_item(item: InventoryItemCreate):
    return {
        "id": len(MOCK_INVENTORY) + 1,
        **item.model_dump(),
        "current_value": None,
        "profit_loss": None,
    }


@router.put("/{item_id}")
async def update_inventory_item(item_id: int, item: InventoryItemUpdate):
    return {"id": item_id, **item.model_dump(exclude_unset=True)}


@router.delete("/{item_id}")
async def delete_inventory_item(item_id: int):
    return {"success": True, "message": f"Item {item_id} deleted"}
