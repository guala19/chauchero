import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from ...models import Transaction, BankAccount, User


def get_user_transactions(
    db: Session,
    user: User,
    *,
    account_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    cursor_date: Optional[datetime] = None,
    cursor_id: Optional[str] = None,
) -> List[Transaction]:
    """
    Fetch user transactions ordered by transaction_date DESC.

    Supports both OFFSET pagination (legacy) and cursor pagination:
    - OFFSET: pass limit + offset (slow for large offsets)
    - Cursor: pass limit + cursor_date + cursor_id (fast, stable)

    Cursor uses (transaction_date, id) for stable ordering when
    multiple transactions share the same date.
    """
    query = (
        db.query(Transaction)
        .join(BankAccount)
        .filter(
            BankAccount.user_rut == user.rut,
            Transaction.deleted_at.is_(None),
        )
    )
    if account_id:
        query = query.filter(Transaction.account_id == account_id)

    # Cursor pagination: fetch rows "after" the cursor position
    if cursor_date is not None and cursor_id is not None:
        query = query.filter(
            or_(
                Transaction.transaction_date < cursor_date,
                and_(
                    Transaction.transaction_date == cursor_date,
                    Transaction.id > uuid.UUID(cursor_id),
                ),
            )
        )

    return (
        query.order_by(
            Transaction.transaction_date.desc(),
            Transaction.id.asc(),
        )
        .limit(limit)
        .all()
    )


def get_user_transaction_by_id(
    db: Session,
    user: User,
    transaction_id,
) -> Optional[Transaction]:
    return (
        db.query(Transaction)
        .join(BankAccount)
        .filter(Transaction.id == transaction_id, BankAccount.user_rut == user.rut, Transaction.deleted_at.is_(None))
        .first()
    )


def upsert_transaction(db: Session, **values) -> bool:
    """Insert transaction if email_id doesn't exist. Returns True if inserted."""
    if "id" not in values:
        values["id"] = uuid.uuid4()

    stmt = (
        pg_insert(Transaction)
        .values(**values)
        .on_conflict_do_nothing(index_elements=["email_id"])
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount > 0


def bulk_upsert_transactions(db: Session, values_list: list) -> int:
    """Insert multiple transactions in a single statement. Returns count of inserted rows."""
    if not values_list:
        return 0
    for v in values_list:
        if "id" not in v:
            v["id"] = uuid.uuid4()
    stmt = (
        pg_insert(Transaction)
        .values(values_list)
        .on_conflict_do_nothing(index_elements=["email_id"])
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def update_transaction(
    db: Session,
    transaction: Transaction,
    **fields,
) -> Transaction:
    for field, value in fields.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction
