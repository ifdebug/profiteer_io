# Profiteer.io

A profitability analysis tool for resellers. Search any item, compare net profit across marketplaces (eBay, Amazon, Mercari, StockX, TCGPlayer), track prices, manage inventory, find arbitrage opportunities, and monitor shipments — all in one place.

## Features

- **Profitability Analyzer** — Enter an item + purchase price, get a profit breakdown across 6+ marketplaces with fees, shipping, and ROI calculated
- **Price Trend Tracker** — Historical price charts across marketplaces with alerts when items hit target prices
- **Inventory Manager** — Track what you own, what you paid, and current market value with unrealized P/L
- **Arbitrage Finder** — Cross-platform price comparison to find buy-low/sell-high opportunities
- **Shipment Tracker** — Multi-carrier tracking (USPS, UPS, FedEx) with visual timeline
- **Deals Tracker** — Aggregated retail deals with resale profit potential indicators
- **Hype Analyzer** — Social signal aggregation (Google Trends, Reddit, Twitter) scored 0-100
- **Notifications** — Price alerts, shipment updates, arbitrage opportunities, hype thresholds

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS, Chart.js, PWA |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Infrastructure | Docker Compose |

No frontend frameworks. No build step. ES modules loaded directly by the browser.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd profiteer_io

# Create environment file
cp .env.example .env

# Start all services
docker-compose up
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **FastAPI backend** on port 8000

### Frontend

The frontend is static files served separately. During development:

```bash
# From the project root
python3 -m http.server 8080
```

Then open [http://localhost:8080/frontend/index.html](http://localhost:8080/frontend/index.html)

### Verify

```bash
# Backend health check
curl http://localhost:8000/api/health

# Should return:
# {"status": "healthy", "version": "0.1.0"}
```

## Project Structure

```
profiteer_io/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + middleware + router registration
│   │   ├── config.py         # Settings from environment
│   │   ├── database.py       # Async SQLAlchemy engine + sessions
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── routers/          # API route handlers
│   │   └── utils/            # Fee calculators, shipping estimators
│   ├── alembic/              # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── index.html            # SPA shell
│   ├── css/                  # Design system (variables, base, layout, components)
│   ├── js/
│   │   ├── app.js            # Entry point
│   │   ├── router.js         # Hash-based SPA router
│   │   ├── api/              # API client modules
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page modules
│   │   ├── storage/          # Offline caching
│   │   └── utils/            # Formatters, DOM helpers, constants
│   ├── sw.js                 # Service worker
│   └── manifest.json         # PWA manifest
├── docs/
│   ├── API_CONTRACT.md       # All endpoints and schemas
│   └── DATABASE_SCHEMA.md    # All tables and relationships
├── PROGRESS.md               # Implementation tracking
└── docker-compose.yml
```

## API

All endpoints are under `/api/v1/`. See [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for the full contract.

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/v1/dashboard/` | Dashboard summary |
| `POST /api/v1/analyzer/analyze` | Profitability analysis |
| `GET /api/v1/trends/{item_id}` | Price history |
| `GET /api/v1/shipments/` | List shipments |
| `GET /api/v1/arbitrage/opportunities` | Arbitrage deals |
| `GET /api/v1/inventory/` | Inventory items |
| `GET /api/v1/deals/` | Retail deals |
| `GET /api/v1/hype/{item_id}` | Hype score |
| `GET /api/v1/notifications/` | Notifications |

## Design

Dark theme (CRT Phosphor palette) by default with light mode toggle. Mobile-first responsive layout with sidebar navigation on desktop and bottom tab bar on mobile.

Colors, typography, and spacing are defined as CSS custom properties in `frontend/css/variables.css`.

## Current Status

**Phase 1 (Foundation)** is complete — app shell, routing, theming, all page layouts, mock API endpoints, and database models.

See [PROGRESS.md](PROGRESS.md) for detailed phase-by-phase tracking.

## License

Private — All rights reserved.
