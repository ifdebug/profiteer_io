# Agent Instructions — Profiteer.io

Instructions for subagents working on this codebase.

## Project Overview

Profiteer.io is a reseller profitability tool. Vanilla JS frontend (no React/Vue/etc), FastAPI backend with PostgreSQL and Redis. All orchestrated via Docker Compose.

## File Locations

- Backend Python code: `backend/app/`
- Frontend entry: `frontend/index.html`
- CSS design tokens: `frontend/css/variables.css`
- JS entry point: `frontend/js/app.js`
- SPA router: `frontend/js/router.js`
- API client: `frontend/js/api/client.js`
- Constants: `frontend/js/utils/constants.js`
- DB models: `backend/app/models/`
- API routes: `backend/app/routers/`
- Pydantic schemas: `backend/app/schemas/`

## Rules When Writing Code

### Frontend

- Use ES module imports with `.js` file extensions: `import { foo } from './bar.js'`
- Page modules must export: `export async function init(container, path) { ... }`
- Never use raw hex colors. Use CSS custom properties from `variables.css` (e.g., `var(--profit)`, `var(--bg-card)`)
- Use semantic color aliases, not raw color names (e.g., `--profit` not `--color-p1-green`)
- Financial numbers: always `font-family: var(--font-mono)` + `font-variant-numeric: tabular-nums`
- Loading states: use skeleton loaders from `components/skeleton.js`, never spinners
- Errors: use `toast.error()` from `components/toast.js` for API failures
- No CDN links. All vendor libs go in `frontend/js/lib/`
- No framework dependencies (no React, Vue, jQuery, etc.)

### Backend

- Python package root is `backend/app/` — imports look like `from app.models.base import Base`
- Use SQLAlchemy 2.0 style: `Mapped[]` type hints + `mapped_column()`
- All API routes go under `/api/v1/` prefix
- Router files: create `router = APIRouter()` at module level
- snake_case for all API response field names
- Pydantic models use `model_config = ConfigDict(from_attributes=True)` for ORM mode
- Phase 1 routers return mock data directly. Phase 2+ will use service classes

### CSS

- Two-layer system: raw colors (`--color-*`) defined only in `variables.css`, semantic aliases (`--bg-*`, `--text-*`, `--profit`, `--loss`, etc.) used everywhere else
- Light mode overrides use `[data-theme="light"]` selector in `variables.css`
- Spacing: use `--space-N` tokens (1=4px through 16=64px)
- Typography scale: `--text-xs` through `--text-4xl`
- Component classes are in `frontend/css/components.css`

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| CSS variables | kebab-case | `--bg-card`, `--text-primary` |
| CSS classes | kebab-case | `.settings-row`, `.btn-primary` |
| JS files | kebab-case | `price-history.js` |
| JS functions/vars | camelCase | `formatCurrency()`, `getDashboardData()` |
| JS exports | camelCase | `export const toast = ...` |
| Python files | snake_case | `price_history.py` |
| Python functions | snake_case | `calculate_net_profit()` |
| DB tables | snake_case plural | `inventory_items`, `price_history` |
| DB columns | snake_case | `purchase_price`, `created_at` |
| API endpoints | kebab/snake in URL | `/api/v1/arbitrage/opportunities` |
| API response fields | snake_case | `profit_margin`, `buy_platform` |

## Do Not

- Add framework dependencies (React, Vue, jQuery, Tailwind, etc.)
- Use CDN links for any library
- Put raw hex colors in CSS/JS outside of `variables.css`
- Use spinners for loading states (use skeleton loaders)
- Create files outside the established directory structure
- Change the `/api/v1/` prefix convention
- Use synchronous SQLAlchemy — this project uses async throughout
