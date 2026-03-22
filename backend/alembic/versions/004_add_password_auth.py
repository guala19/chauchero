"""Switch users PK from UUID to RUT, add password auth fields

Revision ID: 004
Revises: 003
Create Date: 2026-03-21 00:00:00.000000

Replaces UUID id with RUT as primary key. Adds password_hash, first_name,
last_name. Changes bank_accounts FK from user_id (UUID) to user_rut (String).

WARNING: This migration drops all existing user data and dependent records
(bank_accounts, transactions) because the PK type changes fundamentally.
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop dependent tables' FK constraints and columns
    op.drop_constraint('bank_accounts_user_id_fkey', 'bank_accounts', type_='foreignkey')
    op.drop_column('bank_accounts', 'user_id')

    # 2. Drop old users PK and id column
    op.drop_constraint('users_pkey', 'users', type_='primary')
    op.drop_column('users', 'id')

    # 3. Add new columns to users
    op.add_column('users', sa.Column('rut', sa.String(12), nullable=False))
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=False, server_default=''))
    op.add_column('users', sa.Column('first_name', sa.String(100), nullable=False, server_default=''))
    op.add_column('users', sa.Column('last_name', sa.String(100), nullable=False, server_default=''))

    # Remove server defaults (they were only for migration)
    op.alter_column('users', 'password_hash', server_default=None)
    op.alter_column('users', 'first_name', server_default=None)
    op.alter_column('users', 'last_name', server_default=None)

    # 4. Set RUT as new PK
    op.create_primary_key('users_pkey', 'users', ['rut'])

    # 5. Add FK column to bank_accounts pointing to users.rut
    op.add_column('bank_accounts', sa.Column('user_rut', sa.String(12), nullable=False, server_default=''))
    op.alter_column('bank_accounts', 'user_rut', server_default=None)
    op.create_foreign_key(
        'bank_accounts_user_rut_fkey', 'bank_accounts', 'users',
        ['user_rut'], ['rut'], ondelete='CASCADE',
    )

    # 6. Update the unique index on bank_accounts to use user_rut
    op.execute("DROP INDEX IF EXISTS ix_bank_accounts_user_bank_digits")
    op.execute(
        "CREATE UNIQUE INDEX ix_bank_accounts_user_bank_digits "
        "ON bank_accounts (user_rut, bank_name, COALESCE(last_4_digits, ''))"
    )


def downgrade() -> None:
    # Reverse: restore UUID-based schema
    from sqlalchemy.dialects import postgresql

    op.execute("DROP INDEX IF EXISTS ix_bank_accounts_user_bank_digits")

    op.drop_constraint('bank_accounts_user_rut_fkey', 'bank_accounts', type_='foreignkey')
    op.drop_column('bank_accounts', 'user_rut')

    op.drop_constraint('users_pkey', 'users', type_='primary')
    op.drop_column('users', 'rut')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'first_name')
    op.drop_column('users', 'last_name')

    op.add_column('users', sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False))
    op.create_primary_key('users_pkey', 'users', ['id'])

    op.add_column('bank_accounts', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False))
    op.create_foreign_key(
        'bank_accounts_user_id_fkey', 'bank_accounts', 'users',
        ['user_id'], ['id'], ondelete='CASCADE',
    )

    op.execute(
        "CREATE UNIQUE INDEX ix_bank_accounts_user_bank_digits "
        "ON bank_accounts (user_id, bank_name, COALESCE(last_4_digits, ''))"
    )
