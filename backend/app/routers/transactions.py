from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from ..core.database import get_db
from ..services.auth_service import AuthService
from ..services.transaction_service import TransactionService
from ..schemas import TransactionResponse, TransactionUpdate, SyncResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


def get_current_user(token: str = Query(...), db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


# NOTE: All endpoints use `def` (not `async def`) because they call synchronous
# blocking I/O (SQLAlchemy + Gmail API). FastAPI automatically runs `def`
# endpoints in a thread pool, keeping the event loop free for other requests.

@router.post("/sync", response_model=SyncResponse)
def sync_transactions(
    max_emails: int = Query(500, ge=1, le=2000),
    force_full_sync: bool = Query(False),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        stats = TransactionService(db).sync_transactions_for_user(
            user=current_user,
            max_emails=max_emails,
            force_full_sync=force_full_sync,
        )
        return SyncResponse(
            success=True,
            message=f"Sync completed. Created {stats['transactions_created']} transactions.",
            stats=stats,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/debug/gmail-query")
def debug_gmail_query(current_user=Depends(get_current_user)):
    from ..services.gmail_service import GmailService
    svc = object.__new__(GmailService)
    return {
        "last_sync_at": current_user.last_sync_at,
        "query_incremental": svc._build_search_query(current_user.last_sync_at),
        "query_full_resync": svc._build_search_query(None),
    }


@router.get("/debug/gmail-scan")
def debug_gmail_scan(
    max_emails: int = Query(500, ge=1, le=2000),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..services.gmail_service import GmailService
    from ..parsers import parser_registry

    if not current_user.gmail_refresh_token:
        raise HTTPException(status_code=400, detail="No Gmail token — re-autentícate")

    try:
        ts = TransactionService(db)
        gmail = GmailService(ts._get_user_credentials(current_user))
        query = gmail._build_search_query(None)
        emails = gmail.fetch_bank_emails(after_date=None, max_results=max_emails)

        results = []
        for email in emails:
            parser = parser_registry.get_parser_for_email(email)
            parse_result = parse_error = None
            if parser:
                try:
                    parsed = parser.parse(email)
                    if parsed:
                        parse_result = {
                            "amount": str(parsed.amount),
                            "type": parsed.transaction_type,
                            "description": parsed.description,
                            "confidence": parsed.confidence,
                            "date": str(parsed.transaction_date),
                        }
                    else:
                        parse_error = "parser returned None"
                except Exception as e:
                    parse_error = str(e)

            results.append({
                "message_id": email.message_id,
                "sender": email.sender,
                "subject": email.subject,
                "date": str(email.date),
                "has_html_body": bool(email.html_body),
                "parser_found": parser.bank_name if parser else None,
                "parse_result": parse_result,
                "parse_error": parse_error,
            })

        return {
            "gmail_query": query,
            "emails_found": len(emails),
            "last_sync_at": current_user.last_sync_at,
            "results": results,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail scan failed: {str(e)}")


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    account_id: Optional[UUID] = None,
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = TransactionService(db).get_user_transactions(
        user=current_user,
        account_id=str(account_id) if account_id else None,
        limit=limit,
        offset=offset,
    )
    return [TransactionResponse.model_validate(t) for t in transactions]


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: UUID,
    update_data: TransactionUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..models import Transaction, BankAccount

    transaction = (
        db.query(Transaction)
        .join(BankAccount)
        .filter(Transaction.id == transaction_id, BankAccount.user_id == current_user.id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return TransactionResponse.model_validate(transaction)
