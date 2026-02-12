# Profiteer.io

Reseller profitability analysis tool. Full-stack web app with vanilla JS frontend and Python FastAPI backend.

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no frameworks), ES modules, Chart.js 4.x (local copy)
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic, Pydantic v2
- **Infrastructure:** Docker Compose — PostgreSQL 16, Redis 7, uvicorn
- **PWA:** Service worker, manifest.json, offline-first caching

## Project Structure

```
backend/
  app/
    main.py          # FastAPI app, CORS, lifespan, router registration
    config.py         # Pydantic Settings from .env
    database.py       # Async engine + session factory + get_db dependency
    models/           # SQLAlchemy models (DeclarativeBase + TimestampMixin)
    schemas/          # Pydantic request/response models
    routers/          # API route handlers (one file per domain)
    services/         # Business logic (Phase 2+)
    scrapers/         # Marketplace data scrapers (Phase 2+)
    tasks/            # Background jobs (Phase 3+)
    utils/            # Fee calculators, shipping estimators
  alembic/            # Database migrations
frontend/
  index.html          # SPA shell (single HTML file)
  css/
    variables.css     # Design tokens (colors, typography, spacing)
    base.css          # Reset, defaults, animations
    layout.css        # App shell, sidebar, tab bar, grid
    components.css    # Reusable component styles
    pages/            # Per-page CSS
  js/
    app.js            # Entry point (theme, nav, SW, router init)
    router.js         # Hash-based SPA router with dynamic imports
    api/              # API client (client.js + per-endpoint modules)
    components/       # Reusable UI (chart, card, modal, toast, skeleton, table, badge)
    pages/            # Page modules (each exports async init(container, path))
    storage/          # localStorage/IndexedDB wrappers
    utils/            # Formatters, DOM helpers, constants
    lib/              # Vendor libs (chart.min.js)
  assets/icons/       # App icons, favicon
  sw.js               # Service worker
  manifest.json       # PWA manifest
docs/
  API_CONTRACT.md     # All endpoints, schemas, status codes
  DATABASE_SCHEMA.md  # All tables, columns, relationships
```

## Key Conventions

### CSS
- Two-layer color system: raw colors (`--color-void`, `--color-p1-green`) + semantic aliases (`--bg-app`, `--text-primary`, `--profit`, `--loss`)
- Light mode via `[data-theme="light"]` overrides in variables.css
- Typography: `--font-sans` (Inter) for UI, `--font-mono` (JetBrains Mono) for financial numbers
- Financial numbers always use `font-family: var(--font-mono)` and `font-variant-numeric: tabular-nums`
- Spacing scale: `--space-1` (4px) through `--space-16` (64px)
- Never use raw hex colors — always CSS custom properties

### Frontend JS
- ES modules with `.js` extensions in all imports
- Page modules export `async function init(container, path)`
- Components export named objects/functions (e.g., `export const toast = { ... }`)
- API client is a singleton: `export const api = new ApiClient()`
- Loading pattern: skeleton loaders (shimmer), never spinners
- Error pattern: toast notifications for transient errors, inline messages for form validation
- Constants centralized in `js/utils/constants.js`

### Backend Python
- Package root: `backend/app/`
- All endpoints under `/api/v1/` prefix
- Router pattern: `router = APIRouter()` at module level, included in main.py with prefix and tags
- Models use SQLAlchemy 2.0 `Mapped[]` + `mapped_column()` syntax
- TimestampMixin provides `created_at`/`updated_at` on all models
- snake_case for all API response fields
- Phase 1 returns mock data from routers; real services come in Phase 2+

### Chart Colors (colorblind-safe order)
p7-blue, raster-cyan, terminal, p3-amber, degauss, gold-pin, hot-cathode

## Common Commands

```bash
# Start all services (PostgreSQL, Redis, FastAPI)
docker-compose up

# Backend health check
curl http://localhost:8000/api/health

# Serve frontend locally (from project root)
python3 -m http.server 8080
# Then open http://localhost:8080/frontend/index.html

# Generate Alembic migration
cd backend && alembic revision --autogenerate -m "description"

# Apply migrations
cd backend && alembic upgrade head
```

## Current Status

Phase 1 (Foundation) is complete. See PROGRESS.md for detailed tracking.
Phases 2-5 are not started. The plan is in `.claude/plans/`.

## Environment

Copy `.env.example` to `.env` before running. API keys for marketplaces are only needed in Phase 2+.
