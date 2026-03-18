import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from ...models import Transaction, BankAccount, User


def get_user_transactions(
    db: Session,
    user: User,
    *,
    account_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Transaction]:
    query = (
        db.query(Transaction)
        .join(BankAccount)
        .filter(BankAccount.user_id == user.id)
    )
    if account_id:
        query = query.filter(Transaction.account_id == account_id)

    return (
        query.order_by(Transaction.transaction_date.desc())
        .limit(limit)
        .offset(offset)
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
        .filter(Transaction.id == transaction_id, BankAccount.user_id == user.id)
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
