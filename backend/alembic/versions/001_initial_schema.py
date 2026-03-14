"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-03-09 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('gmail_refresh_token', sa.Text(), nullable=True),
    sa.Column('gmail_token_expires_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('last_sync_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    op.create_table('bank_accounts',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('bank_name', sa.String(length=100), nullable=False),
    sa.Column('last_4_digits', sa.String(length=4), nullable=True),
    sa.Column('account_type', sa.String(length=50), nullable=True),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('parser_rules',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('bank_name', sa.String(length=100), nullable=False),
    sa.Column('email_from_pattern', sa.String(length=255), nullable=False),
    sa.Column('subject_pattern', sa.String(length=255), nullable=True),
    sa.Column('regex_rules', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('priority', sa.Integer(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_parser_rules_bank_name'), 'parser_rules', ['bank_name'], unique=False)
    
    op.create_table('transactions',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('transaction_date', sa.DateTime(), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('transaction_type', sa.String(length=50), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('email_id', sa.String(length=255), nullable=False),
    sa.Column('email_subject', sa.Text(), nullable=True),
    sa.Column('parser_confidence', sa.Integer(), nullable=True),
    sa.Column('is_validated', sa.Boolean(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['bank_accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transactions_email_id'), 'transactions', ['email_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_transactions_email_id'), table_name='transactions')
    op.drop_table('transactions')
    op.drop_index(op.f('ix_parser_rules_bank_name'), table_name='parser_rules')
    op.drop_table('parser_rules')
    op.drop_table('bank_accounts')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
