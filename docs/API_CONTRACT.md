# Profiteer.io — API Contract

Base URL: `http://localhost:8000/api/v1`

All endpoints return JSON. Phase 1 uses mock data; real integrations come in Phase 2+.

---

## Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Returns `{ "status": "healthy", "version": "0.1.0" }` |

---

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/` | Aggregated dashboard data |

**Response fields:** `profit_summary`, `inventory_snapshot`, `active_shipments`, `hot_arbitrage`, `recent_alerts`, `trending_hype`, `recent_activity`

---

## Analyzer

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyzer/analyze` | Analyze item profitability |

**Request body** (`ProfitabilityRequest`):

| Field | Type | Required | Default |
|-------|------|----------|---------|
| query | string | yes | — |
| purchase_price | float | no | null |
| condition | string | no | "new" |
| weight_oz | float | no | null |
| shipping_cost | float | no | null |
| packaging_cost | float | no | 1.50 |

**Response** (`ProfitabilityResponse`):

| Field | Type |
|-------|------|
| item_name | string |
| item_image | string \| null |
| purchase_price | float |
| best_marketplace | string |
| best_profit | float |
| marketplaces | MarketplaceResult[] |

**MarketplaceResult fields:** `marketplace`, `avg_sold_price`, `active_listing_price`, `platform_fee`, `payment_processing_fee`, `estimated_shipping`, `packaging_cost`, `net_profit`, `profit_margin`, `roi`, `sales_volume`, `profitability` ("strong" | "marginal" | "loss")

---

## Trends

| Method | Path | Description |
|--------|------|-------------|
| GET | `/trends/{item_id}?period=30d` | Price history for an item |

**Query params:** `period` — "7d", "30d", "90d", "1y", "all" (default: "30d")

**Response fields:** `item_id`, `item_name`, `period`, `current_price`, `price_change_pct`, `trend` ("rising" | "falling" | "stable"), `marketplaces` (keyed by name, each with `data[]`, `current`, `high`, `low`, `avg`), `volume` (`total_sales_period`, `avg_daily_sales`)

---

## Shipments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shipments/` | List all shipments |
| GET | `/shipments/{shipment_id}` | Get one shipment |
| POST | `/shipments/` | Create shipment |

**Create body** (`ShipmentCreate`):

| Field | Type | Required |
|-------|------|----------|
| tracking_number | string | yes |
| carrier | string | yes |
| origin | string | no |
| destination | string | no |
| items | dict | no |

**Shipment object fields:** `id`, `tracking_number`, `carrier`, `status` (label_created | accepted | in_transit | out_for_delivery | delivered | exception), `origin`, `destination`, `estimated_delivery`, `events[]` (each: `timestamp`, `status`, `location`, `description`), `created_at`

**List response** includes `summary` with `total`, `in_transit`, `delivered`, `out_for_delivery`, `exception` counts.

---

## Arbitrage

| Method | Path | Description |
|--------|------|-------------|
| GET | `/arbitrage/opportunities` | Arbitrage opportunities |

**Query params:** `category` (optional), `min_profit` (optional), `condition` (optional)

**Opportunity fields:** `id`, `item_name`, `category`, `image_url`, `buy_platform`, `buy_price`, `buy_condition`, `sell_platform`, `sell_price`, `estimated_fees`, `estimated_shipping`, `estimated_profit`, `profit_margin`, `roi`, `risk_score` (0-100), `confidence` ("high" | "medium" | "low"), `avg_days_to_sell`

**Response** includes `total` and `categories[]`.

---

## Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory/` | List all inventory items |
| GET | `/inventory/{item_id}` | Get one item |
| POST | `/inventory/` | Add item |
| PUT | `/inventory/{item_id}` | Update item |
| DELETE | `/inventory/{item_id}` | Delete item |

**Create body** (`InventoryItemCreate`):

| Field | Type | Required | Default |
|-------|------|----------|---------|
| name | string | yes | — |
| purchase_price | float | yes | — |
| purchase_date | date | no | null |
| purchase_source | string | no | null |
| condition | string | no | "new" |
| quantity | int | no | 1 |
| listing_status | string | no | "unlisted" |
| storage_location | string | no | null |
| notes | string | no | null |

**Update body** (`InventoryItemUpdate`): same fields, all optional.

**Item fields:** `id`, `name`, `purchase_price`, `purchase_date`, `purchase_source`, `condition`, `quantity`, `listing_status`, `storage_location`, `notes`, `current_value`, `profit_loss`

**List response** includes `summary` with `total_items`, `total_value`, `total_cost`, `unrealized_pl`.

---

## Deals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/deals/` | List deals |

**Query params:** `category` (optional), `retailer` (optional)

**Deal fields:** `id`, `retailer`, `title`, `description`, `url`, `original_price`, `deal_price`, `discount_pct`, `category`, `start_date`, `end_date`, `upvotes`, `downvotes`, `profit_potential`

**Response** includes `total`, `upcoming_events[]` (each: `name`, `date`, `retailers[]`), `categories[]`, `retailers[]`.

---

## Hype

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hype/leaderboards` | Category leaderboards |
| GET | `/hype/{item_id}` | Item hype score |

**Hype fields:** `item_name`, `hype_score` (0-100), `trend` ("rising" | "peaking" | "stable" | "falling" | "dead"), `signals` (`google_trends`, `reddit_mentions`, `twitter_mentions`, `youtube_videos`, `youtube_views`, `tiktok_views`), `history[]` (each: `date`, `score`)

**Leaderboards response:** keyed by category, each an array of `{ name, score, trend }`.

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications/` | List notifications |
| PUT | `/notifications/{id}/read` | Mark one as read |
| PUT | `/notifications/read-all` | Mark all as read |

**Notification fields:** `id`, `type` (price_alert | shipment | arbitrage | deal | hype | inventory), `title`, `message`, `read`, `timestamp`, `link`

**List response** includes `unread_count` and `total`.

---

## Pydantic Schemas Summary

| Module | Models |
|--------|--------|
| common.py | PaginationParams, APIResponse |
| analyzer.py | ProfitabilityRequest, MarketplaceResult, ProfitabilityResponse |
| inventory.py | InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse, InventorySummary |
| shipment.py | ShipmentEvent, ShipmentCreate, ShipmentResponse |
| deal.py | DealResponse |
| alert.py | AlertCreate, AlertResponse, NotificationResponse |

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 404 | Not found |
| 422 | Validation error |
| 500 | Server error |
