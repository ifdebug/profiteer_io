"""Carrier tracking service — scrape public tracking pages for shipment status.

Provides tracking status and event history for USPS, UPS, and FedEx by
scraping their public tracking pages. No API keys required.

Each carrier's tracking page is fetched via httpx and parsed with BeautifulSoup.
If scraping fails (anti-bot, format change, etc.), the tracker falls back to a
"unable to update" status without crashing.

Usage:
    from app.services.carrier_tracker import carrier_tracker
    result = await carrier_tracker.track("USPS", "9400111899223456789012")
"""

import logging
import random
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

# Status normalization mapping
STATUS_MAP = {
    # USPS statuses
    "delivered": "delivered",
    "out for delivery": "out_for_delivery",
    "in transit": "in_transit",
    "in transit to next facility": "in_transit",
    "arrived at facility": "in_transit",
    "departed facility": "in_transit",
    "accepted": "in_transit",
    "shipping label created": "label_created",
    "label created": "label_created",
    "pre-shipment": "label_created",
    "alert": "exception",
    "notice left": "exception",
    "available for pickup": "exception",
    # UPS statuses
    "on the way": "in_transit",
    "on its way": "in_transit",
    "out for delivery today": "out_for_delivery",
    "pickup": "in_transit",
    "label created": "label_created",
    "order processed": "label_created",
    # FedEx statuses
    "picked up": "in_transit",
    "at local fedex facility": "in_transit",
    "at destination sort facility": "in_transit",
    "on fedex vehicle for delivery": "out_for_delivery",
    "delivery exception": "exception",
}


def _normalize_status(raw_status: str) -> str:
    """Map raw carrier status text to our normalized status enum."""
    lower = raw_status.strip().lower()
    # Try direct match
    if lower in STATUS_MAP:
        return STATUS_MAP[lower]
    # Try partial matches
    for key, value in STATUS_MAP.items():
        if key in lower:
            return value
    # Default
    if "deliver" in lower:
        return "delivered"
    if "transit" in lower:
        return "in_transit"
    if "label" in lower or "created" in lower:
        return "label_created"
    return "in_transit"


class CarrierTracker:
    """Scrape carrier tracking pages for shipment status and events."""

    async def track(self, carrier: str, tracking_number: str) -> dict | None:
        """Fetch tracking info for a shipment.

        Returns dict with:
            - status: str (normalized)
            - events: list[dict] (timestamp, status, location, description)
            - estimated_delivery: str | None
        Or None if tracking fails entirely.
        """
        carrier_lower = carrier.lower()
        try:
            if carrier_lower == "usps":
                return await self._track_usps(tracking_number)
            elif carrier_lower == "ups":
                return await self._track_ups(tracking_number)
            elif carrier_lower == "fedex":
                return await self._track_fedex(tracking_number)
            else:
                logger.info("No tracker for carrier: %s", carrier)
                return None
        except Exception as exc:
            logger.warning(
                "Tracking failed for %s %s: %s", carrier, tracking_number, exc
            )
            return None

    async def _fetch(self, url: str, headers: dict | None = None) -> str | None:
        """Fetch a URL with browser-like headers."""
        default_headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        if headers:
            default_headers.update(headers)

        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=15.0,
            ) as client:
                resp = await client.get(url, headers=default_headers)
                if resp.status_code != 200:
                    logger.warning(
                        "HTTP %d fetching %s", resp.status_code, url
                    )
                    return None
                return resp.text
        except Exception as exc:
            logger.warning("Fetch error for %s: %s", url, exc)
            return None

    # ------------------------------------------------------------------
    # USPS
    # ------------------------------------------------------------------

    async def _track_usps(self, tracking_number: str) -> dict | None:
        """Track a USPS package by scraping the tracking page.

        USPS tracking data is loaded dynamically via JavaScript, so we use
        their API endpoint that returns JSON.
        """
        url = f"https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}"
        html = await self._fetch(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")

        # Try to extract from the page
        events = []
        status = "label_created"
        estimated_delivery = None

        # USPS renders tracking in .track-bar-container and .result-container
        # Look for status banner
        status_banner = soup.select_one(".tb-status, .delivery_status")
        if status_banner:
            raw_status = status_banner.get_text(strip=True)
            status = _normalize_status(raw_status)

        # Look for estimated delivery
        eta_el = soup.select_one(".eta-date, .expected_delivery")
        if eta_el:
            estimated_delivery = eta_el.get_text(strip=True)

        # Parse tracking events
        event_rows = soup.select(".track-bar-detail-con, .tracking-detail")
        for row in event_rows:
            desc_el = row.select_one(".tb-status-detail, .tracking-status")
            loc_el = row.select_one(".tb-location, .tracking-location")
            time_el = row.select_one(".tb-date, .tracking-date-time")

            if desc_el:
                events.append({
                    "timestamp": time_el.get_text(strip=True) if time_el else datetime.utcnow().isoformat(),
                    "status": _normalize_status(desc_el.get_text(strip=True)),
                    "location": loc_el.get_text(strip=True) if loc_el else "",
                    "description": desc_el.get_text(strip=True),
                })

        # If no events parsed from HTML, the page may be JS-rendered
        if not events:
            logger.info("USPS tracking page returned no parseable events for %s", tracking_number)
            return None

        # Overall status from latest event
        if events:
            status = events[0].get("status", status)

        return {
            "status": status,
            "events": events,
            "estimated_delivery": estimated_delivery,
        }

    # ------------------------------------------------------------------
    # UPS
    # ------------------------------------------------------------------

    async def _track_ups(self, tracking_number: str) -> dict | None:
        """Track a UPS package.

        UPS tracking is heavily JavaScript-rendered. We attempt to scrape
        the initial HTML but may get limited data.
        """
        url = f"https://www.ups.com/track?tracknum={tracking_number}&loc=en_US"
        html = await self._fetch(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")
        events = []
        status = "label_created"

        # UPS uses React/Angular and loads tracking data via API
        # The HTML may contain initial state in script tags
        # Look for tracking info in page content
        status_el = soup.select_one(".ups-txt_size_5, #stApp_txtPackageStatus")
        if status_el:
            status = _normalize_status(status_el.get_text(strip=True))

        # Try to find event rows
        activity_rows = soup.select(".ups-activity_row, .tabs_panel_detail")
        for row in activity_rows:
            desc = row.select_one(".ups-activity_desc, .activity-desc")
            loc = row.select_one(".ups-activity_loc, .activity-location")
            time = row.select_one(".ups-activity_date, .activity-date-time")

            if desc:
                events.append({
                    "timestamp": time.get_text(strip=True) if time else datetime.utcnow().isoformat(),
                    "status": _normalize_status(desc.get_text(strip=True)),
                    "location": loc.get_text(strip=True) if loc else "",
                    "description": desc.get_text(strip=True),
                })

        if not events:
            logger.info("UPS tracking page returned no parseable events for %s", tracking_number)
            return None

        if events:
            status = events[0].get("status", status)

        return {
            "status": status,
            "events": events,
            "estimated_delivery": None,
        }

    # ------------------------------------------------------------------
    # FedEx
    # ------------------------------------------------------------------

    async def _track_fedex(self, tracking_number: str) -> dict | None:
        """Track a FedEx package.

        FedEx is also heavily JS-rendered. We try the initial page HTML.
        """
        url = f"https://www.fedex.com/fedextrack/?trknbr={tracking_number}"
        html = await self._fetch(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")
        events = []
        status = "label_created"

        # FedEx renders via Angular, limited HTML data available
        status_el = soup.select_one(
            ".shipmentStatusText, .travel-history-header__status"
        )
        if status_el:
            status = _normalize_status(status_el.get_text(strip=True))

        # Look for scan events
        scan_rows = soup.select(".travel-history__scan-event, .scan-event-row")
        for row in scan_rows:
            desc = row.select_one(".scan-event__description, .description")
            loc = row.select_one(".scan-event__location, .location")
            time = row.select_one(".scan-event__date, .date-time")

            if desc:
                events.append({
                    "timestamp": time.get_text(strip=True) if time else datetime.utcnow().isoformat(),
                    "status": _normalize_status(desc.get_text(strip=True)),
                    "location": loc.get_text(strip=True) if loc else "",
                    "description": desc.get_text(strip=True),
                })

        if not events:
            logger.info("FedEx tracking page returned no parseable events for %s", tracking_number)
            return None

        if events:
            status = events[0].get("status", status)

        return {
            "status": status,
            "events": events,
            "estimated_delivery": None,
        }


carrier_tracker = CarrierTracker()
