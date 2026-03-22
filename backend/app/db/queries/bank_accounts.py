from typing import Optional
from sqlalchemy.orm import Session
from ...models import User, BankAccount


def get_or_create_account(
    db: Session,
    user: User,
    *,
    bank_name: str,
    last_4_digits: Optional[str] = None,
    currency: str = "CLP",
) -> BankAccount:
    query = db.query(BankAccount).filter(
        BankAccount.user_rut == user.rut,
        BankAccount.bank_name == bank_name,
        BankAccount.deleted_at.is_(None),
    )
    if last_4_digits:
        query = query.filter(BankAccount.last_4_digits == last_4_digits)

    account = query.first()
    if account:
        return account

    account = BankAccount(
        user_rut=user.rut,
        bank_name=bank_name,
        last_4_digits=last_4_digits,
        currency=currency,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
