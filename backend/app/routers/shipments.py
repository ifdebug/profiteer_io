"""Shipment Tracker endpoints — CRUD with mock tracking timeline."""

from fastapi import APIRouter

from app.schemas.shipment import ShipmentCreate

router = APIRouter()

MOCK_SHIPMENTS = [
    {
        "id": 1,
        "tracking_number": "9400111899223456789012",
        "carrier": "USPS",
        "status": "in_transit",
        "origin": "Denver, CO",
        "destination": "Los Angeles, CA",
        "estimated_delivery": "2026-02-13T18:00:00Z",
        "events": [
            {"timestamp": "2026-02-11T08:30:00Z", "status": "in_transit", "location": "Phoenix, AZ", "description": "In Transit to Next Facility"},
            {"timestamp": "2026-02-10T14:22:00Z", "status": "in_transit", "location": "Albuquerque, NM", "description": "Arrived at USPS Regional Facility"},
            {"timestamp": "2026-02-09T16:45:00Z", "status": "in_transit", "location": "Denver, CO", "description": "Departed USPS Regional Origin Facility"},
            {"timestamp": "2026-02-09T10:12:00Z", "status": "accepted", "location": "Denver, CO", "description": "Accepted at USPS Origin Facility"},
            {"timestamp": "2026-02-08T22:00:00Z", "status": "label_created", "location": "Denver, CO", "description": "Shipping Label Created"},
        ],
        "created_at": "2026-02-08T22:00:00Z",
    },
    {
        "id": 2,
        "tracking_number": "1Z999AA10123456784",
        "carrier": "UPS",
        "status": "delivered",
        "origin": "New York, NY",
        "destination": "Chicago, IL",
        "estimated_delivery": "2026-02-10T17:00:00Z",
        "events": [
            {"timestamp": "2026-02-10T14:05:00Z", "status": "delivered", "location": "Chicago, IL", "description": "Delivered - Left at Front Door"},
            {"timestamp": "2026-02-10T07:30:00Z", "status": "out_for_delivery", "location": "Chicago, IL", "description": "Out For Delivery Today"},
            {"timestamp": "2026-02-09T22:15:00Z", "status": "in_transit", "location": "Hodgkins, IL", "description": "Arrived at Facility"},
            {"timestamp": "2026-02-08T18:00:00Z", "status": "in_transit", "location": "New York, NY", "description": "Departed Facility"},
            {"timestamp": "2026-02-08T12:00:00Z", "status": "label_created", "location": "New York, NY", "description": "Shipment Picked Up"},
        ],
        "created_at": "2026-02-08T12:00:00Z",
    },
    {
        "id": 3,
        "tracking_number": "789456123012345678",
        "carrier": "FedEx",
        "status": "exception",
        "origin": "Seattle, WA",
        "destination": "Miami, FL",
        "estimated_delivery": None,
        "events": [
            {"timestamp": "2026-02-11T10:00:00Z", "status": "exception", "location": "Memphis, TN", "description": "Delay - Weather conditions"},
            {"timestamp": "2026-02-10T05:30:00Z", "status": "in_transit", "location": "Memphis, TN", "description": "At FedEx Hub"},
            {"timestamp": "2026-02-09T14:00:00Z", "status": "in_transit", "location": "Portland, OR", "description": "In transit"},
            {"timestamp": "2026-02-08T20:00:00Z", "status": "label_created", "location": "Seattle, WA", "description": "Picked up"},
        ],
        "created_at": "2026-02-08T20:00:00Z",
    },
    {
        "id": 4,
        "tracking_number": "9261290100130736410086",
        "carrier": "USPS",
        "status": "out_for_delivery",
        "origin": "Austin, TX",
        "destination": "Dallas, TX",
        "estimated_delivery": "2026-02-11T17:00:00Z",
        "events": [
            {"timestamp": "2026-02-11T06:45:00Z", "status": "out_for_delivery", "location": "Dallas, TX", "description": "Out for Delivery"},
            {"timestamp": "2026-02-11T04:30:00Z", "status": "in_transit", "location": "Dallas, TX", "description": "Arrived at Post Office"},
            {"timestamp": "2026-02-10T18:00:00Z", "status": "in_transit", "location": "Austin, TX", "description": "Departed"},
            {"timestamp": "2026-02-10T10:00:00Z", "status": "label_created", "location": "Austin, TX", "description": "Label Created"},
        ],
        "created_at": "2026-02-10T10:00:00Z",
    },
]


@router.get("")
async def get_shipments():
    return {
        "shipments": MOCK_SHIPMENTS,
        "summary": {
            "total": len(MOCK_SHIPMENTS),
            "in_transit": sum(1 for s in MOCK_SHIPMENTS if s["status"] == "in_transit"),
            "delivered": sum(1 for s in MOCK_SHIPMENTS if s["status"] == "delivered"),
            "out_for_delivery": sum(1 for s in MOCK_SHIPMENTS if s["status"] == "out_for_delivery"),
            "exception": sum(1 for s in MOCK_SHIPMENTS if s["status"] == "exception"),
        },
    }


@router.get("/{shipment_id}")
async def get_shipment(shipment_id: int):
    for s in MOCK_SHIPMENTS:
        if s["id"] == shipment_id:
            return s
    return {"error": "Shipment not found"}


@router.post("")
async def create_shipment(shipment: ShipmentCreate):
    return {
        "id": len(MOCK_SHIPMENTS) + 1,
        "tracking_number": shipment.tracking_number,
        "carrier": shipment.carrier,
        "status": "label_created",
        "origin": shipment.origin,
        "destination": shipment.destination,
        "estimated_delivery": None,
        "events": [],
        "created_at": "2026-02-11T16:00:00Z",
    }
