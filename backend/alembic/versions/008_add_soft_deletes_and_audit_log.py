"""Add soft deletes and audit log table

Revision ID: 008
Revises: 007
Create Date: 2026-03-22 00:00:00.000000

Adds deleted_at to users, bank_accounts, and transactions for soft deletes.
Creates audit_logs table for tracking user actions.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Soft deletes ─────────────────────────────────────────────────────
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('bank_accounts', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('transactions', sa.Column('deleted_at', sa.DateTime(), nullable=True))

    # Partial index: only query non-deleted records
    op.execute("CREATE INDEX ix_users_active ON users (rut) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX ix_transactions_active ON transactions (account_id) WHERE deleted_at IS NULL")

    # ── Audit log ────────────────────────────────────────────────────────
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_rut', sa.String(12), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('metadata_json', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_user_rut', 'audit_logs', ['user_rut'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_rut', table_name='audit_logs')
    op.drop_table('audit_logs')

    op.execute("DROP INDEX IF EXISTS ix_transactions_active")
    op.execute("DROP INDEX IF EXISTS ix_users_active")
    op.drop_column('transactions', 'deleted_at')
    op.drop_column('bank_accounts', 'deleted_at')
    op.drop_column('users', 'deleted_at')
