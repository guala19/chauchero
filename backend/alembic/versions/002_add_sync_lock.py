"""Add sync lock fields to users

Revision ID: 002
Revises: 001
Create Date: 2026-03-17 00:00:00.000000

Adds is_syncing (bool) and sync_started_at (datetime) to the users table.
These fields are used to prevent simultaneous syncs for the same user and
to auto-reset stuck syncs (is_syncing=True for more than SYNC_LOCK_TIMEOUT_MINUTES).
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_syncing', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('sync_started_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'sync_started_at')
    op.drop_column('users', 'is_syncing')
