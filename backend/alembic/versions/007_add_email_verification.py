"""Add email verification field

Revision ID: 007
Revises: 006
Create Date: 2026-03-22 00:00:00.000000

Adds email_verified boolean to users table. Defaults to False.
Users must verify their email to access full features.
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'email_verified')
