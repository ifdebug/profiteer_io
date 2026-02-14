"""add hype_snapshots table

Revision ID: a3f7b2d91e4c
Revises: c0cd0a8cbded
Create Date: 2026-02-13 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f7b2d91e4c'
down_revision: Union[str, None] = 'c0cd0a8cbded'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('hype_snapshots',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('score', sa.Integer(), nullable=False),
    sa.Column('trend', sa.String(length=20), nullable=False),
    sa.Column('price_velocity_score', sa.Float(), nullable=False),
    sa.Column('volume_score', sa.Float(), nullable=False),
    sa.Column('marketplace_spread_score', sa.Float(), nullable=False),
    sa.Column('price_premium_score', sa.Float(), nullable=False),
    sa.Column('momentum_score', sa.Float(), nullable=False),
    sa.Column('recency_score', sa.Float(), nullable=False),
    sa.Column('total_data_points', sa.Integer(), nullable=False),
    sa.Column('marketplace_count', sa.Integer(), nullable=False),
    sa.Column('price_change_pct', sa.Float(), nullable=False),
    sa.Column('avg_daily_volume', sa.Float(), nullable=False),
    sa.Column('recorded_at', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['items.id'], name=op.f('fk_hype_snapshots_item_id_items')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_hype_snapshots'))
    )
    op.create_index(op.f('ix_hype_snapshots_item_id'), 'hype_snapshots', ['item_id'], unique=False)
    op.create_index(op.f('ix_hype_snapshots_recorded_at'), 'hype_snapshots', ['recorded_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_hype_snapshots_recorded_at'), table_name='hype_snapshots')
    op.drop_index(op.f('ix_hype_snapshots_item_id'), table_name='hype_snapshots')
    op.drop_table('hype_snapshots')
