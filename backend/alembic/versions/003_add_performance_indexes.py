"""Add performance indexes and unique constraints

Revision ID: 003
Revises: 002
Create Date: 2026-03-18 00:00:00.000000

Two additions:

1. Composite index on transactions(account_id, transaction_date DESC)
   ─ The main transactions listing query filters by account_id (via JOIN)
     and orders by transaction_date DESC.  Without a composite index,
     PostgreSQL performs a sequential scan + in-memory sort.  With it,
     the planner can satisfy both the filter and the sort from a single
     backward index scan.

2. Unique index on bank_accounts(user_id, bank_name, COALESCE(last_4_digits, ''))
   ─ Prevents duplicate accounts for the same user + bank + card.
     Uses COALESCE because last_4_digits is nullable (e.g. Tenpo
     transfers), and PostgreSQL treats NULL ≠ NULL in unique indexes,
     which would allow duplicates we don't want.
"""
from alembic import op

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

# ── Index names (explicit for clean downgrade) ───────────────────────────────

IX_TXN_ACCOUNT_DATE = 'ix_transactions_account_id_date_desc'
IX_BA_UNIQUE = 'ix_bank_accounts_user_bank_digits_unique'


def upgrade() -> None:
    # 1. Composite index: speeds up GET /transactions/ (filter + ORDER BY)
    op.execute(
        f'CREATE INDEX {IX_TXN_ACCOUNT_DATE} '
        f'ON transactions (account_id, transaction_date DESC)'
    )

    # 2. Unique index: prevents duplicate bank accounts per user
    #    COALESCE handles NULL last_4_digits (Tenpo transfers, etc.)
    op.execute(
        f'CREATE UNIQUE INDEX {IX_BA_UNIQUE} '
        f"ON bank_accounts (user_id, bank_name, COALESCE(last_4_digits, ''))"
    )


def downgrade() -> None:
    op.drop_index(IX_BA_UNIQUE, table_name='bank_accounts')
    op.drop_index(IX_TXN_ACCOUNT_DATE, table_name='transactions')
