"""Import all models for Alembic discovery."""

from app.models.base import Base
from app.models.user import User
from app.models.item import Item
from app.models.price_history import PriceHistory
from app.models.inventory import InventoryItem
from app.models.shipment import Shipment
from app.models.alert import Alert
from app.models.deal import Deal

__all__ = [
    "Base",
    "User",
    "Item",
    "PriceHistory",
    "InventoryItem",
    "Shipment",
    "Alert",
    "Deal",
]
