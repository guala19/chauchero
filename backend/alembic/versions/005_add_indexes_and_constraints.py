"""Add missing indexes and CHECK constraints

Revision ID: 005
Revises: 004
Create Date: 2026-03-21 00:00:00.000000

1. Index on bank_accounts(user_rut) — FK not auto-indexed by PostgreSQL.
   Every transaction listing query joins through this column.

2. Partial index on transactions(account_id) WHERE category IS NULL —
   speeds up the categorization endpoint that filters uncategorized txs.

3. CHECK constraints on transaction_type, currency, and transaction_date
   to enforce data integrity at the DB level.
"""
from alembic import op

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Missing indexes ──────────────────────────────────────────────────
    op.execute(
        "CREATE INDEX ix_bank_accounts_user_rut "
        "ON bank_accounts (user_rut)"
    )
    op.execute(
        "CREATE INDEX ix_transactions_uncategorized "
        "ON transactions (account_id) WHERE category IS NULL"
    )

    # ── CHECK constraints ────────────────────────────────────────────────
    op.execute(
        "ALTER TABLE transactions "
        "ADD CONSTRAINT ck_transaction_type_valid "
        "CHECK (transaction_type IN ('debit', 'credit', 'transfer_debit', 'transfer_credit'))"
    )
    op.execute(
        "ALTER TABLE bank_accounts "
        "ADD CONSTRAINT ck_currency_valid "
        "CHECK (currency IN ('CLP', 'USD', 'UF'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bank_accounts DROP CONSTRAINT ck_currency_valid")
    op.execute("ALTER TABLE transactions DROP CONSTRAINT ck_transaction_type_valid")
    op.drop_index("ix_transactions_uncategorized", table_name="transactions")
    op.drop_index("ix_bank_accounts_user_rut", table_name="bank_accounts")
