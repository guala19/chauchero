import uuid
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import func
from ...models import User, BankAccount


def get_or_create_account(
    db: Session,
    user: User,
    *,
    bank_name: str,
    last_4_digits: Optional[str] = None,
    currency: str = "CLP",
) -> BankAccount:
    """
    Get existing bank account or create a new one.

    Uses INSERT ... ON CONFLICT on the unique index
    (user_id, bank_name, COALESCE(last_4_digits, '')) to handle
    concurrent requests safely — no race conditions.
    """
    # Try fast path first: existing account
    query = db.query(BankAccount).filter(
        BankAccount.user_id == user.id,
        BankAccount.bank_name == bank_name,
    )
    if last_4_digits:
        query = query.filter(BankAccount.last_4_digits == last_4_digits)
    else:
        query = query.filter(BankAccount.last_4_digits.is_(None))

    account = query.first()
    if account:
        return account

    # Slow path: insert with conflict safety
    values = dict(
        id=uuid.uuid4(),
        user_id=user.id,
        bank_name=bank_name,
        last_4_digits=last_4_digits,
        currency=currency,
    )
    stmt = (
        pg_insert(BankAccount)
        .values(**values)
        .on_conflict_do_nothing(
            index_elements=[
                BankAccount.user_id,
                BankAccount.bank_name,
                func.coalesce(BankAccount.last_4_digits, ''),
            ],
        )
    )
    result = db.execute(stmt)
    db.commit()

    if result.rowcount > 0:
        # Row was inserted — fetch it
        return db.query(BankAccount).filter(BankAccount.id == values["id"]).one()

    # Conflict: another request created it between our SELECT and INSERT
    db.expire_all()
    return query.one()
