"""Add account lockout fields

Revision ID: 006
Revises: 005
Create Date: 2026-03-21 00:00:00.000000

Adds failed_login_attempts and last_failed_login_at to users table
for brute force protection. After 10 failed attempts, the account
is locked for 15 minutes.
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_failed_login_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_failed_login_at')
    op.drop_column('users', 'failed_login_attempts')
