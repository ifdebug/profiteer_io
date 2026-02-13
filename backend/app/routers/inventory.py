"""Inventory Manager endpoints — full CRUD backed by PostgreSQL."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    InventorySummary,
)
from app.services.inventory import inventory_service

router = APIRouter()


@router.get("", response_model=InventorySummary)
async def get_inventory(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all inventory items with summary statistics."""
    return await inventory_service.get_all(db, status=status)


@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single inventory item by ID."""
    item = await inventory_service.get_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("", response_model=InventoryItemResponse, status_code=201)
async def create_inventory_item(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new inventory item."""
    return await inventory_service.create(db, data)


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: int,
    data: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update an inventory item."""
    item = await inventory_service.update(db, item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete an inventory item."""
    deleted = await inventory_service.delete(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True, "message": f"Item {item_id} deleted"}
