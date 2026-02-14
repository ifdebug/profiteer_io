"""add profit_potential to deals

Revision ID: b5e9c3f12a7d
Revises: a3f7b2d91e4c
Create Date: 2026-02-13 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b5e9c3f12a7d'
down_revision: Union[str, None] = 'a3f7b2d91e4c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('deals', sa.Column('profit_potential', sa.Numeric(precision=10, scale=2), nullable=True))

    # Seed initial deal data using raw SQL to avoid asyncpg type issues with dates
    op.execute(sa.text("""
        INSERT INTO deals (retailer, title, description, url, original_price, deal_price, discount_pct, category, start_date, end_date, upvotes, downvotes, profit_potential)
        VALUES
        ('Walmart', 'Pokemon 151 Booster Bundle - Clearance',
         'Pokemon TCG 151 Booster Bundle marked down to clearance price. Great for resale on eBay/TCGPlayer.',
         'https://www.walmart.com/ip/pokemon-151-booster-bundle',
         39.99, 24.97, 37.6, 'trading_cards', '2026-02-10', '2026-02-28', 42, 3, 18.53),

        ('Target', 'LEGO Technic Ferrari Daytona SP3 - 20% Off',
         'Target Circle members get 20% off this popular LEGO set. Resells for $450+ on eBay.',
         'https://www.target.com/p/lego-technic-ferrari',
         399.99, 319.99, 20.0, 'toys', '2026-02-14', '2026-02-20', 28, 5, 63.50),

        ('Best Buy', 'Sony WH-1000XM5 Headphones - Presidents Day Sale',
         'Sony flagship noise cancelling headphones at lowest price ever. Strong resale on Amazon/eBay.',
         'https://www.bestbuy.com/sony-wh1000xm5',
         399.99, 278.00, 30.5, 'electronics', '2026-02-14', '2026-02-17', 67, 8, 52.99),

        ('Amazon', 'Nike Dunk Low Retro - Lightning Deal',
         'Popular Nike Dunks at 35% off retail. Limited sizes available. StockX resale $140+.',
         'https://www.amazon.com/dp/nike-dunk-low',
         110.00, 71.50, 35.0, 'sneakers', '2026-02-13', '2026-02-13', 89, 12, 38.35),

        ('GameStop', 'Funko Pop! One Piece Gear 5 Luffy - Exclusive',
         'GameStop exclusive Funko Pop. Already selling for $45+ on eBay. Limited stock.',
         'https://www.gamestop.com/funko-pop-luffy',
         14.99, 14.99, 0.0, 'collectibles', '2026-02-12', NULL, 134, 6, 20.26),

        ('Costco', 'Apple AirPods Pro 2 - Warehouse Deal',
         'Costco members-only pricing on AirPods Pro 2. Sells for $200+ new on eBay.',
         'https://www.costco.com/apple-airpods-pro',
         249.99, 189.99, 24.0, 'electronics', '2026-02-10', '2026-03-01', 56, 15, 0.00),

        ('Walmart', 'Hot Wheels Monster Trucks 10-Pack - Rollback',
         'Popular Hot Wheels set at Walmart Rollback pricing. Sells for $35+ on Amazon.',
         'https://www.walmart.com/ip/hot-wheels-monster-trucks',
         24.97, 15.00, 39.9, 'toys', '2026-02-11', '2026-02-25', 23, 4, 8.75),

        ('Target', 'Magic: The Gathering - Murders at Karlov Manor Bundle',
         'MTG bundle at Target Circle price. TCGPlayer market price is $55+.',
         'https://www.target.com/p/mtg-karlov-manor',
         52.99, 37.09, 30.0, 'trading_cards', '2026-02-13', '2026-02-19', 31, 7, 6.66)
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        DELETE FROM deals WHERE title IN (
            'Pokemon 151 Booster Bundle - Clearance',
            'LEGO Technic Ferrari Daytona SP3 - 20% Off',
            'Sony WH-1000XM5 Headphones - Presidents Day Sale',
            'Nike Dunk Low Retro - Lightning Deal',
            'Funko Pop! One Piece Gear 5 Luffy - Exclusive',
            'Apple AirPods Pro 2 - Warehouse Deal',
            'Hot Wheels Monster Trucks 10-Pack - Rollback',
            'Magic: The Gathering - Murders at Karlov Manor Bundle'
        )
    """))
    op.drop_column('deals', 'profit_potential')
