"""add notifications table

Revision ID: d8a2e4f67b91
Revises: b5e9c3f12a7d
Create Date: 2026-02-14 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd8a2e4f67b91'
down_revision: Union[str, None] = 'b5e9c3f12a7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('link', sa.String(length=500), nullable=True),
    sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    sa.Column('read_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_notifications_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications'))
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_notifications_read'), 'notifications', ['read'], unique=False)

    # Seed initial notifications for demo
    op.execute(sa.text("""
        INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
        VALUES
        (1, 'price_alert', 'Price Drop Alert',
         'Nike Dunk Low Panda dropped to $98 on StockX (your target: $100)',
         '#/trends', false, NOW() - INTERVAL '30 minutes'),

        (1, 'price_alert', 'Target Price Hit',
         'Pokemon 151 Booster Box hit your sell target of $145 on eBay',
         '#/analyzer', false, NOW() - INTERVAL '2 hours'),

        (1, 'shipment', 'Package Delivered',
         'Your UPS package to Chicago, IL was delivered at 2:05 PM',
         '#/shipments', true, NOW() - INTERVAL '1 day'),

        (1, 'arbitrage', 'New Arbitrage Opportunity',
         'LEGO AT-AT: Buy at Walmart $159.99, sell on eBay for ~$230. Est. profit: $38',
         '#/arbitrage', true, NOW() - INTERVAL '1 day 4 hours'),

        (1, 'deal', 'Deal Alert',
         'Target Buy 2 Get 1 Free on trading cards starts today!',
         '#/deals', true, NOW() - INTERVAL '2 days'),

        (1, 'hype', 'Hype Alert',
         'Pokemon Prismatic Evolutions hype score crossed 90 (now 92)',
         '#/hype', false, NOW() - INTERVAL '3 hours'),

        (1, 'inventory', 'Value Change',
         'Air Jordan 1 Chicago value increased by $25 to $320',
         '#/inventory', true, NOW() - INTERVAL '14 hours')
    """))


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
