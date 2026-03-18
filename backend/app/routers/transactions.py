from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from ..core.database import get_db
from ..services.transaction_service import TransactionService, SyncCooldownError, SyncInProgressError
from ..services.gmail_service import GmailAuthError
from ..schemas import (
    TransactionResponse,
    TransactionUpdate,
    SyncResponse,
    SyncStats,
    DebugGmailQueryResponse,
    DebugGmailScanResponse,
)
from .deps import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


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
            stats=SyncStats(**stats),
        )
    except SyncCooldownError as e:
        raise HTTPException(
            status_code=429,
            detail=f"Sync reciente. Espera {e.minutes_remaining} minuto(s) antes de volver a sincronizar.",
        )
    except SyncInProgressError:
        raise HTTPException(
            status_code=409,
            detail="Ya hay un sync en progreso para este usuario. Intenta en unos momentos.",
        )
    except (GmailAuthError, ValueError) as e:
        if "Gmail" in str(e) or "token" in str(e).lower():
            raise HTTPException(status_code=401, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/debug/gmail-query", response_model=DebugGmailQueryResponse)
def debug_gmail_query(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return TransactionService(db).debug_gmail_query(current_user)


@router.get("/debug/gmail-scan", response_model=DebugGmailScanResponse)
def debug_gmail_scan(
    max_emails: int = Query(500, ge=1, le=2000),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return TransactionService(db).debug_gmail_scan(current_user, max_emails)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
    transactions = TransactionService(db).list_transactions(
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
    transaction = TransactionService(db).update_transaction(
        user=current_user,
        transaction_id=transaction_id,
        fields=update_data.model_dump(exclude_unset=True),
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionResponse.model_validate(transaction)
