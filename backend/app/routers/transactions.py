from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from ..core.database import get_db
from ..core.config import settings as app_settings
from ..services.transaction_service import TransactionService, SyncCooldownError, SyncInProgressError
from ..services.gmail_service import GmailAuthError
from ..services.category_service import CATEGORIES
from ..db.queries.users import release_sync_lock
from ..schemas import (
    TransactionResponse,
    TransactionUpdate,
    SyncResponse,
    SyncStats,
    DebugGmailQueryResponse,
    DebugGmailScanResponse,
)
from ..schemas.transaction import PaginatedTransactions
from .deps import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


# NOTE: All endpoints use `def` (not `async def`) because they call synchronous
# blocking I/O (SQLAlchemy + Gmail API). FastAPI automatically runs `def`
# endpoints in a thread pool, keeping the event loop free for other requests.


@router.post(
    "/sync",
    response_model=SyncResponse,
    summary="Sincronizar transacciones desde Gmail",
    description=(
        "Busca emails bancarios en Gmail del usuario, los parsea y guarda las transacciones nuevas en DB. "
        "Por defecto es incremental (solo emails desde el último sync). "
        "Usar `force_full_sync=true` para reprocesar todos los emails históricos. "
        "Tiene cooldown de 5 minutos por usuario para evitar abusos."
    ),
    responses={
        401: {"description": "Token JWT inválido o token de Gmail expirado/revocado — requiere re-login"},
        409: {"description": "Ya hay un sync en progreso para este usuario"},
        429: {"description": "Sync muy reciente — esperar el cooldown (default: 5 minutos)"},
        500: {"description": "Error interno durante el sync"},
    },
)
def sync_transactions(
    max_emails: int = Query(500, ge=1, le=2000, description="Máximo de emails a procesar"),
    force_full_sync: bool = Query(False, description="Si true, ignora last_sync_at y reprocesa todo"),
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
        import structlog
        structlog.get_logger(__name__).error("Sync failed", error=str(e), exc_info=True)
        detail = f"Sync failed: {str(e)}" if app_settings.ENVIRONMENT == "development" else "Sync failed. Please try again later."
        raise HTTPException(status_code=500, detail=detail)


@router.get(
    "/categories",
    response_model=List[str],
    summary="Listar categorías disponibles",
    description="Retorna la lista de categorías válidas para transacciones.",
)
def list_categories():
    return CATEGORIES


@router.post(
    "/categorize",
    summary="Categorizar transacciones sin categoría",
    description=(
        "Aplica categorización automática a todas las transacciones del usuario "
        "que no tienen categoría asignada. No sobreescribe categorías existentes."
    ),
    responses={
        401: {"description": "Token JWT inválido o expirado"},
    },
)
def categorize_transactions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = TransactionService(db).categorize_uncategorized(current_user)
    return result


@router.get(
    "/debug/gmail-query",
    response_model=DebugGmailQueryResponse,
    summary="[Debug] Ver query de Gmail que se usaría en el sync",
    description=(
        "Retorna la query de Gmail que se ejecutaría en el próximo sync, "
        "tanto incremental (desde last_sync_at) como full resync. "
        "Útil para diagnosticar por qué no se están encontrando emails."
    ),
    responses={
        401: {"description": "Token JWT inválido o expirado"},
    },
)
def debug_gmail_query(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if app_settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    return TransactionService(db).debug_gmail_query(current_user)


@router.get(
    "/debug/gmail-scan",
    response_model=DebugGmailScanResponse,
    summary="[Debug] Escanear emails sin guardar transacciones",
    description=(
        "Busca emails en Gmail y muestra qué parser se usaría y qué datos extraería, "
        "sin guardar nada en DB. "
        "Útil para validar que el parser funciona correctamente con emails reales."
    ),
    responses={
        400: {"description": "No hay token de Gmail — re-autenticarse"},
        401: {"description": "Token JWT inválido o expirado"},
        500: {"description": "Error al escanear Gmail"},
    },
)
def debug_gmail_scan(
    max_emails: int = Query(500, ge=1, le=2000, description="Máximo de emails a escanear"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if app_settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    try:
        return TransactionService(db).debug_gmail_scan(current_user, max_emails)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail scan failed: {str(e)}")


@router.get(
    "/",
    response_model=PaginatedTransactions,
    summary="Listar transacciones",
    description=(
        "Retorna las transacciones del usuario autenticado, ordenadas por fecha descendente. "
        "Soporta paginación por cursor (recomendado) o por offset (legacy)."
    ),
    responses={
        401: {"description": "Token JWT inválido o expirado"},
    },
)
def list_transactions(
    account_id: Optional[UUID] = Query(None, description="Filtrar por ID de cuenta bancaria"),
    limit: int = Query(500, ge=1, le=2000, description="Número de resultados a retornar"),
    offset: int = Query(0, ge=0, description="Offset (legacy, usar cursor_date/cursor_id en su lugar)"),
    cursor_date: Optional[str] = Query(None, description="Cursor: fecha ISO de la última transacción vista"),
    cursor_id: Optional[str] = Query(None, description="Cursor: UUID de la última transacción vista"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch limit+1 to detect if there are more results
    transactions = TransactionService(db).list_transactions(
        user=current_user,
        account_id=str(account_id) if account_id else None,
        limit=limit + 1,
        offset=offset,
        cursor_date=cursor_date,
        cursor_id=cursor_id,
    )

    has_more = len(transactions) > limit
    items = transactions[:limit]

    next_cursor_date = None
    next_cursor_id = None
    if has_more and items:
        last = items[-1]
        next_cursor_date = last.transaction_date.isoformat()
        next_cursor_id = str(last.id)

    return PaginatedTransactions(
        items=[TransactionResponse.model_validate(t) for t in items],
        next_cursor=f"{next_cursor_date}|{next_cursor_id}" if has_more else None,
        has_more=has_more,
    )


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Actualizar transacción",
    description=(
        "Actualiza campos de una transacción existente. "
        "Solo se modifican los campos enviados (PATCH semántico). "
        "Útil para corregir categorías o agregar notas manualmente."
    ),
    responses={
        401: {"description": "Token JWT inválido o expirado"},
        404: {"description": "Transacción no encontrada o no pertenece al usuario"},
    },
)
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


@router.post(
    "/sync/force-unlock",
    summary="Liberar sync lock trabado",
    description="Libera el lock de sincronización si quedó trabado por un crash del servidor.",
)
def force_unlock_sync(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release_sync_lock(db, current_user)
    return {"status": "unlocked"}
