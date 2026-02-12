# Profiteer.io — Database Schema

PostgreSQL 16 via SQLAlchemy async ORM.

---

## Naming Conventions

All constraints follow SQLAlchemy naming convention:

- **Primary Key:** `pk_[table]`
- **Foreign Key:** `fk_[table]_[column]_[referred_table]`
- **Unique:** `uq_[table]_[column]`
- **Index:** `ix_[column_label]`
- **Check:** `ck_[table]_[constraint]`

---

## TimestampMixin

Applied to all tables except `price_history`:

| Column | Type | Default | On Update |
|--------|------|---------|-----------|
| created_at | datetime | `now()` | — |
| updated_at | datetime | `now()` | `now()` |

---

## Tables

### users

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| email | varchar(255) | unique, indexed | — | no |
| username | varchar(100) | unique, indexed | — | no |
| hashed_password | varchar(255) | — | — | no |
| settings | json | — | null | yes |
| created_at | datetime | — | now() | no |
| updated_at | datetime | — | now() | no |

**Relationships:** → inventory_items, shipments, alerts

---

### items

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| name | varchar(500) | indexed | — | no |
| upc | varchar(50) | indexed | null | yes |
| sku | varchar(100) | — | null | yes |
| category | varchar(100) | indexed | null | yes |
| image_url | varchar(1000) | — | null | yes |
| description | text | — | null | yes |
| created_at | datetime | — | now() | no |
| updated_at | datetime | — | now() | no |

**Relationships:** → price_history, inventory_items, alerts

---

### price_history

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| item_id | integer | FK → items.id, indexed | — | no |
| marketplace | varchar(50) | indexed | — | no |
| price | numeric(10,2) | — | — | no |
| condition | varchar(50) | — | null | yes |
| sold_date | datetime | — | null | yes |
| recorded_at | datetime | indexed | now() | no |

No TimestampMixin — uses `recorded_at` instead.

---

### inventory_items

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| user_id | integer | FK → users.id, indexed | — | no |
| item_id | integer | FK → items.id, indexed | null | yes |
| name | varchar(500) | — | — | no |
| purchase_price | numeric(10,2) | — | — | no |
| purchase_date | date | — | null | yes |
| purchase_source | varchar(200) | — | null | yes |
| condition | varchar(50) | — | "new" | no |
| quantity | integer | — | 1 | no |
| listing_status | varchar(50) | indexed | "unlisted" | no |
| storage_location | varchar(200) | — | null | yes |
| notes | text | — | null | yes |
| current_value | numeric(10,2) | — | null | yes |
| created_at | datetime | — | now() | no |
| updated_at | datetime | — | now() | no |

---

### shipments

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| user_id | integer | FK → users.id, indexed | — | no |
| tracking_number | varchar(100) | indexed | — | no |
| carrier | varchar(50) | — | — | no |
| status | varchar(50) | — | "label_created" | no |
| origin | varchar(200) | — | null | yes |
| destination | varchar(200) | — | null | yes |
| estimated_delivery | datetime | — | null | yes |
| items | json | — | null | yes |
| events | json | — | null | yes |
| created_at | datetime | — | now() | no |
| updated_at | datetime | — | now() | no |

---

### alerts

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| user_id | integer | FK → users.id, indexed | — | no |
| item_id | integer | FK → items.id, indexed | — | no |
| alert_type | varchar(50) | — | — | no |
| threshold_value | numeric(10,2) | — | — | no |
| is_active | boolean | — | true | no |
| last_triggered | datetime | — | null | yes |
| created_at | datetime | — | now() | no |
| updated_at | datetime | — | now() | no |

---

### deals

| Column | Type | Constraints | Default | Nullable |
|--------|------|-------------|---------|----------|
| id | integer | PK | auto | no |
| retailer | varchar(100) | indexed | — | no |
| title | varchar(500) | — | — | no |
| description | text | — | null | yes |
| url | varchar(1000) | — | null | yes |
| original_price | numeric(10,2) | — | null | yes |
| deal_price | numeric(10,2) | — | — | no |
| discount_pct | numeric(5,2) | — | null | yes |
| category | varchar(100) | indexed | — | yes |
| start_date | date | — | null | yes |
| end_date | date | — | null | yes |
| upvotes | integer | — | 0 | no |
| downvotes | integer | — | 0 | no |
| created_at | datetime | — | now() | no |
| updated_at | datetime | — | now() | no |

---

## Entity Relationship Diagram

```
users ─────┬──< inventory_items >──┬───── items
            │                       │
            ├──< shipments          ├──< price_history
            │                       │
            └──< alerts >───────────┘

deals (standalone, no FK relationships)
```

**Legend:** `──<` = one-to-many, `>──` = many-to-one

---

## Indexes

| Table | Column(s) | Type |
|-------|-----------|------|
| users | email | unique + index |
| users | username | unique + index |
| items | name | index |
| items | upc | index |
| items | category | index |
| price_history | item_id | index (FK) |
| price_history | marketplace | index |
| price_history | recorded_at | index |
| inventory_items | user_id | index (FK) |
| inventory_items | item_id | index (FK) |
| inventory_items | listing_status | index |
| shipments | user_id | index (FK) |
| shipments | tracking_number | index |
| alerts | user_id | index (FK) |
| alerts | item_id | index (FK) |
| deals | retailer | index |
| deals | category | index |
