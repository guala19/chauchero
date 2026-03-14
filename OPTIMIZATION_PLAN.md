# Chauchero — Plan de Optimización de Performance

> Fecha: 2026-03-13
> Objetivo: Eliminar las 5 causas principales de alta latencia detectadas en el análisis.
> Este archivo existe para dar contexto completo al agente que implemente los cambios.

---

## Contexto del Proyecto

- **Backend**: FastAPI, SQLAlchemy síncrono, PostgreSQL 15 (Docker), Alembic
- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind v4
- **Auth**: Google OAuth 2.0 → JWT en cookie `auth-token`
- **Entorno**: macOS, Docker para Postgres

### Rutas clave
```
/Users/diego/Documents/Chauchero/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── gmail_batch_service.py   ← FIX #1
│   │   │   └── transaction_service.py   ← FIX #2
│   │   ├── models/
│   │   │   ├── transaction.py           ← FIX #4
│   │   │   └── bank_account.py          ← FIX #4
│   │   ├── routers/
│   │   │   └── transactions.py          ← FIX #3 (nuevo endpoint) + FIX #6 (seguridad)
│   │   ├── schemas/
│   │   │   └── transaction.py           ← FIX #3 (nuevo schema)
│   │   └── alembic/versions/            ← FIX #4 (migración)
└── frontend/
    ├── app/dashboard/
    │   ├── page.tsx                     ← FIX #3 + FIX #5
    │   └── layout.tsx
    └── components/
        └── layouts/DashboardShell.tsx   ← FIX #5 + FIX #6
```

---

## Fix #1 — Aplanar el doble ThreadPoolExecutor en Gmail Batch

### Archivo: `backend/app/services/gmail_batch_service.py`

### Problema
`_process_batch()` crea un `ThreadPoolExecutor` interno *dentro* de cada worker del pool externo. Con `MAX_BATCH_SIZE=10` y `MAX_WORKERS=5`, genera hasta **50 threads simultáneos**. El overhead de crear/destruir pools anidados y el context-switching reducen el beneficio del paralelismo.

### Configuración actual
```python
MAX_BATCH_SIZE = 10
MAX_WORKERS = 5

# En _process_batch():
with ThreadPoolExecutor(max_workers=len(message_ids)) as executor:  # ← inner pool
    futures = {executor.submit(self._fetch_single_message, msg_id): idx ...}
```

### Solución
Eliminar el ThreadPoolExecutor interno. Usar un único pool flat a nivel de `get_messages_batch()` donde cada worker llama directamente a `_fetch_single_message()`. Ajustar `MAX_WORKERS=15`.

### Implementación

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

logger = logging.getLogger(__name__)

MAX_WORKERS = 15  # Un solo pool flat

class GmailBatchService:
    def get_messages_batch(self, message_ids: list[str]) -> list[EmailData]:
        if not message_ids:
            return []

        results = []
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(self._fetch_single_message, mid): mid
                for mid in message_ids
            }
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=30)
                    if result:
                        results.append(result)
                except Exception as e:
                    logger.warning(f"Failed to fetch message {futures[future]}: {e}")

        return results

    # Eliminar _create_batches() y _process_batch()
    # _fetch_single_message() y _convert_to_email_data() se mantienen igual
```

### Impacto esperado
- Reducción de 50 threads a máximo 15
- Eliminación de overhead de creación/destrucción de pools anidados
- Throughput real aumenta por menos context switching

---

## Fix #2 — Batch insert: un solo commit para todas las transacciones

### Archivo: `backend/app/services/transaction_service.py`

### Problema
`_process_email()` hace `db.add()` + `db.commit()` por cada email procesado. Con 500 emails = 500 commits = **7.5 a 50 segundos solo en escrituras a PostgreSQL**.

### Patrón actual (simplificado)
```python
def sync_transactions_for_user(self, user, max_emails, force_full_sync):
    emails = gmail_service.get_messages(...)
    for email in emails:
        result = self._process_email(user, email, gmail_service)
        # _process_email() hace db.add(transaction) + db.commit() internamente
```

### Solución
Refactorizar `_process_email()` → `_build_transaction()` que retorna el objeto `Transaction` (o `None`) **sin hacer commit**. Acumular todos los objetos y hacer un único `db.add_all()` + `db.commit()` al final.

### ⚠️ Riesgos a manejar

**Riesgo 1 — `_get_or_create_account()` hace commit prematuro:**
Actualmente `_get_or_create_account()` hace `db.add(account)` + `db.commit()`. Si se llama dentro del loop mientras se acumulan transacciones con `db.add()`, ese commit intermedio commitea las transacciones pendientes en el session, rompiendo la atomicidad del batch.

**Solución:** Cambiar `_get_or_create_account()` para usar `db.flush()` en lugar de `db.commit()`. Flush envía el INSERT al motor de DB para obtener el ID generado, pero no hace commit de la transacción de DB:

```python
def _get_or_create_account(self, user, bank_name, last_4_digits=None):
    # ... query como ahora ...
    if not account:
        account = BankAccount(
            user_id=user.id,
            bank_name=bank_name,
            last_4_digits=last_4_digits,
            currency="CLP"
        )
        self.db.add(account)
        self.db.flush()  # ← obtiene account.id SIN commit
    return account
```

**Riesgo 2 — Duplicados en memoria:**
La verificación de duplicados (`db.query(Transaction).filter_by(email_id=...)`) solo ve lo que está en la DB, no las transacciones acumuladas en memoria. Si Gmail retorna el mismo message_id dos veces, habrá un `IntegrityError` por violación del `UNIQUE` en `email_id`.

**Solución:** Agregar deduplicación en memoria con un `set`:

```python
seen_email_ids = set()
for email in emails:
    if email.message_id in seen_email_ids:
        stats["transactions_skipped"] += 1
        continue
    seen_email_ids.add(email.message_id)
    # ... proceso normal ...
```

### Implementación completa

```python
import logging

logger = logging.getLogger(__name__)

def sync_transactions_for_user(self, user, max_emails=500, force_full_sync=False):
    if not user.gmail_refresh_token:
        raise ValueError("User has no Gmail token configured")

    credentials = self._get_user_credentials(user)
    gmail_service = GmailService(credentials)

    after_date = None if force_full_sync else user.last_sync_at
    emails = gmail_service.fetch_bank_emails(
        after_date=after_date,
        max_results=max_emails
    )

    stats = {
        "emails_fetched": len(emails),
        "transactions_created": 0,
        "transactions_skipped": 0,
        "parsing_errors": 0,
        "unsupported_banks": 0
    }

    transactions_to_create = []
    seen_email_ids = set()  # ← deduplicación en memoria

    for email in emails:
        # Evitar duplicados dentro del mismo batch
        if email.message_id in seen_email_ids:
            stats["transactions_skipped"] += 1
            continue
        seen_email_ids.add(email.message_id)

        transaction, status = self._build_transaction(user, email, gmail_service)

        if status == "created" and transaction:
            transactions_to_create.append(transaction)

        stats[f"transactions_{status}"] = stats.get(f"transactions_{status}", 0) + 1

    # UN SOLO COMMIT para todas las transacciones
    if transactions_to_create:
        try:
            self.db.add_all(transactions_to_create)
            self.db.commit()
            stats["transactions_created"] = len(transactions_to_create)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Batch insert failed: {e}")
            raise

    user.last_sync_at = datetime.utcnow()
    self.db.commit()

    return stats

def _build_transaction(self, user, email, gmail_service) -> tuple[Transaction | None, str]:
    """Como _process_email() pero sin db.commit(). Retorna (obj, status)."""
    existing = self.db.query(Transaction).filter(
        Transaction.email_id == email.message_id
    ).first()
    if existing:
        return None, "skipped"

    parser = parser_registry.get_parser_for_email(email)
    if not parser:
        return None, "no_parser"

    try:
        parsed = parser.parse(email)
        if not parsed:
            return None, "error"

        if not TransactionValidator.is_valid(parsed):
            return None, "error"

        sanitized_description = TransactionValidator.sanitize_description(parsed.description)
        sanitized_amount = TransactionValidator.sanitize_amount(parsed.amount)
        normalized_type = TransactionValidator.normalize_transaction_type(parsed.transaction_type)

        account = self._get_or_create_account(
            user=user,
            bank_name=parser.bank_name,
            last_4_digits=parsed.last_4_digits
        )

        transaction = Transaction(
            account_id=account.id,
            amount=sanitized_amount,
            transaction_date=parsed.transaction_date,
            description=sanitized_description,
            transaction_type=normalized_type,
            category=parsed.category,
            email_id=email.message_id,
            email_subject=email.subject,
            parser_confidence=parsed.confidence,
            is_validated=parsed.confidence >= 90
        )

        # NO hacer db.add() ni db.commit() aquí
        return transaction, "created"

    except Exception as e:
        logger.error(f"Error building transaction for email {email.message_id}: {e}")
        return None, "error"

def _get_or_create_account(self, user, bank_name, last_4_digits=None):
    """Get existing or create new bank account. Usa flush() en vez de commit()."""
    query = self.db.query(BankAccount).filter(
        BankAccount.user_id == user.id,
        BankAccount.bank_name == bank_name
    )
    if last_4_digits:
        query = query.filter(BankAccount.last_4_digits == last_4_digits)

    account = query.first()

    if not account:
        account = BankAccount(
            user_id=user.id,
            bank_name=bank_name,
            last_4_digits=last_4_digits,
            currency="CLP"
        )
        self.db.add(account)
        self.db.flush()  # ← obtiene account.id sin commitear
        self.db.refresh(account)

    return account
```

### Impacto esperado
- 500 emails: de 500 commits → 1 commit
- Latencia de escritura: de 7.5-50s → 0.05-0.2s
- El mayor win de todos los fixes

---

## Fix #3 — Endpoint de stats server-side + eliminar carga masiva en dashboard

### Archivos
- `backend/app/routers/transactions.py` (nuevo endpoint)
- `backend/app/schemas/transaction.py` (nuevo schema)
- `frontend/app/dashboard/page.tsx` (consumir nuevo endpoint)

### Problema
El dashboard hace `GET /transactions/?limit=500` y luego filtra/agrega en el cliente. Transfiere ~250KB de JSON solo para computar números que el servidor ya tiene en la DB.

### Solución Parte A — Nuevo schema Pydantic

Agregar en `backend/app/schemas/transaction.py`:

```python
class MonthlyStats(BaseModel):
    year: int
    month: int
    gastos: float
    ingresos: float

class CategoryStats(BaseModel):
    category: str
    total: float
    count: int

class DashboardStatsResponse(BaseModel):
    gasto_mes: float
    ingreso_mes: float
    total_gastos: float
    total_ingresos: float
    gastos_count: int
    ingresos_count: int
    mes_count: int
    monthly: list[MonthlyStats]
    by_category: list[CategoryStats]
```

### Solución Parte B — Nuevo endpoint backend

Agregar en `backend/app/routers/transactions.py`.

**⚠️ CORRECCIÓN IMPORTANTE:** El plan original usaba `func.sum(...).filter(...)` que **no es sintaxis válida en SQLAlchemy**. La forma correcta es `func.sum(case(...))`. Además, las queries con `extract()` no pueden usar índices B-tree, así que usar filtros de rango en `transaction_date` para aprovechar el índice `ix_transaction_account_date`.

```python
from sqlalchemy import func, case
from datetime import datetime, timezone

@router.get("/stats", response_model=DashboardStatsResponse)
def get_transaction_stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stats pre-computados para el dashboard."""
    from ..models import Transaction, BankAccount

    now = datetime.now(timezone.utc)
    # Usar rangos de fecha en vez de extract() para aprovechar índice B-tree
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = month_start.replace(year=now.year + 1, month=1)
    else:
        month_end = month_start.replace(month=now.month + 1)

    # Base filter: transacciones del usuario
    user_filter = BankAccount.user_id == current_user.id

    is_expense = Transaction.transaction_type != "transfer_credit"
    is_income = Transaction.transaction_type == "transfer_credit"

    # Mes actual — una sola query con case()
    mes_stats = db.query(
        func.coalesce(func.sum(case((is_expense, Transaction.amount), else_=0)), 0).label("gasto_mes"),
        func.coalesce(func.sum(case((is_income, Transaction.amount), else_=0)), 0).label("ingreso_mes"),
        func.count(Transaction.id).label("mes_count"),
    ).join(BankAccount).filter(
        user_filter,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date < month_end,
    ).first()

    # Totales históricos
    total_stats = db.query(
        func.coalesce(func.sum(case((is_expense, Transaction.amount), else_=0)), 0).label("total_gastos"),
        func.coalesce(func.sum(case((is_income, Transaction.amount), else_=0)), 0).label("total_ingresos"),
        func.sum(case((is_expense, 1), else_=0)).label("gastos_count"),
        func.sum(case((is_income, 1), else_=0)).label("ingresos_count"),
    ).join(BankAccount).filter(user_filter).first()

    # Últimos 6 meses (para el gráfico de barras)
    # Calcular inicio de hace 6 meses
    six_months_ago = month_start.replace(month=now.month - 5) if now.month > 5 else \
        month_start.replace(year=now.year - 1, month=now.month + 7)

    from sqlalchemy import extract
    monthly = db.query(
        extract("year", Transaction.transaction_date).label("year"),
        extract("month", Transaction.transaction_date).label("month"),
        func.coalesce(func.sum(case((is_expense, Transaction.amount), else_=0)), 0).label("gastos"),
        func.coalesce(func.sum(case((is_income, Transaction.amount), else_=0)), 0).label("ingresos"),
    ).join(BankAccount).filter(
        user_filter,
        Transaction.transaction_date >= six_months_ago,
    ).group_by("year", "month").order_by("year", "month").all()

    # Por categoría del mes actual (para el donut)
    by_category = db.query(
        func.coalesce(Transaction.category, "Sin categoría").label("category"),
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).join(BankAccount).filter(
        user_filter,
        is_expense,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date < month_end,
    ).group_by(Transaction.category).all()

    return {
        "gasto_mes": float(mes_stats.gasto_mes),
        "ingreso_mes": float(mes_stats.ingreso_mes),
        "total_gastos": float(total_stats.total_gastos),
        "total_ingresos": float(total_stats.total_ingresos),
        "gastos_count": int(total_stats.gastos_count or 0),
        "ingresos_count": int(total_stats.ingresos_count or 0),
        "mes_count": int(mes_stats.mes_count or 0),
        "monthly": [
            {"year": int(r.year), "month": int(r.month),
             "gastos": float(r.gastos), "ingresos": float(r.ingresos)}
            for r in monthly
        ],
        "by_category": [
            {"category": r.category, "total": float(r.total or 0), "count": r.count}
            for r in by_category
        ],
    }
```

**IMPORTANTE sobre el orden de las rutas:** El endpoint `/stats` debe registrarse **antes** de la ruta `/{transaction_id}` en el router, porque FastAPI evalúa las rutas en orden y `/{transaction_id}` capturaría "stats" como un UUID inválido.

### Solución Parte C — Simplificar dashboard/page.tsx

```typescript
// app/dashboard/page.tsx
const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface DashboardStats {
  gasto_mes: number;
  ingreso_mes: number;
  total_gastos: number;
  total_ingresos: number;
  gastos_count: number;
  ingresos_count: number;
  mes_count: number;
  monthly: { year: number; month: number; gastos: number; ingresos: number }[];
  by_category: { category: string; total: number; count: number }[];
}

async function fetchStats(token: string): Promise<DashboardStats | null> {
  try {
    const res = await fetch(`${API_URL}/transactions/stats?token=${token}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRecentTransactions(token: string): Promise<ApiTransaction[]> {
  try {
    const res = await fetch(`${API_URL}/transactions/?token=${token}&limit=4`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Hacer ambos fetches en paralelo:
const [stats, recentFour] = await Promise.all([
  fetchStats(token),
  fetchRecentTransactions(token),
]);

// Eliminar computeStats(), computeMonthly(), computeSegments() — ya no se necesitan
```

### Impacto esperado
- Payload del dashboard: de ~250KB → ~2KB
- Tiempo de carga: de 2-8s → 200-500ms
- Cálculos delegados a PostgreSQL (indexado) en lugar de JS
- Las funciones `computeStats`, `computeMonthly`, `computeSegments` se eliminan

---

## Fix #4 — Índices faltantes en la base de datos

### Archivos
- `backend/app/models/transaction.py`
- `backend/app/models/bank_account.py`
- Nueva migración Alembic en `backend/alembic/versions/`

### Índices a agregar

**En `transaction.py` (modelo SQLAlchemy):**
```python
from sqlalchemy import Index

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transaction_account_date", "account_id", "transaction_date"),
        Index("ix_transaction_type", "transaction_type"),
        Index("ix_transaction_date", "transaction_date"),
        # email_id ya tiene index=True en la columna
    )
    # ... columnas sin cambio ...
```

**Nota:** El índice compuesto `(account_id, transaction_date)` es el más importante — cubre los JOINs del endpoint `/stats` y el `ORDER BY transaction_date` del listado de transacciones. Las queries del Fix #3 que usan rangos de fecha (`transaction_date >= X AND transaction_date < Y`) aprovechan este índice directamente a través del B-tree.

**En `bank_account.py`:**
```python
from sqlalchemy import Index

class BankAccount(Base):
    __tablename__ = "bank_accounts"
    __table_args__ = (
        Index("ix_bank_account_user_bank", "user_id", "bank_name"),
    )
    # ... columnas sin cambio ...
```

**Migración Alembic — generar con autogenerate:**
```bash
cd /Users/diego/Documents/Chauchero/backend
alembic revision --autogenerate -m "add_performance_indexes"
# Revisar el archivo generado, luego:
alembic upgrade head
```

El archivo generado debería contener:
```python
def upgrade():
    op.create_index("ix_transaction_account_date", "transactions", ["account_id", "transaction_date"])
    op.create_index("ix_transaction_type", "transactions", ["transaction_type"])
    op.create_index("ix_transaction_date", "transactions", ["transaction_date"])
    op.create_index("ix_bank_account_user_bank", "bank_accounts", ["user_id", "bank_name"])

def downgrade():
    op.drop_index("ix_bank_account_user_bank", table_name="bank_accounts")
    op.drop_index("ix_transaction_date", table_name="transactions")
    op.drop_index("ix_transaction_type", table_name="transactions")
    op.drop_index("ix_transaction_account_date", table_name="transactions")
```

**Nota:** `op.drop_index()` requiere `table_name` como parámetro — el plan original lo omitía.

### Impacto esperado
- Queries con ORDER BY transaction_date: de O(n) scan → O(log n) B-tree
- JOIN entre transactions y bank_accounts: usa índice en account_id
- Filtrado por user_id en bank_accounts: usa índice compuesto
- Queries del stats endpoint con rangos de fecha: uso directo del B-tree

---

## Fix #5 — Suspense boundaries + eliminar router.refresh() bloqueante

### Archivos
- `frontend/components/layouts/DashboardShell.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/dashboard/layout.tsx`

### Problema

**Problema A — `router.refresh()` bloquea UI:**
Después del sync, `router.refresh()` (línea 47 de DashboardShell.tsx) fuerza re-renderizado completo de todos los Server Components. El usuario ve spinner por la duración total: sync (1-20s) + fetch (1-5s) + render.

**Problema B — Sin Suspense, el dashboard bloquea hasta tener todos los datos:**
```typescript
// Actual: todo bloqueado hasta que fetchTransactions() resuelve
const transactions = await fetchTransactions(token);  // espera completa
const stats = computeStats(transactions);             // luego esto
return <Dashboard stats={stats} />;                   // luego renderiza
```

### Solución A — Reemplazar router.refresh() con revalidación

En `DashboardShell.tsx`, en lugar de `router.refresh()` después del sync, usar `revalidatePath` via un Server Action o `router.refresh()` junto con Suspense (que lo hace no-bloqueante porque los skeletons se muestran inmediatamente).

**Opción pragmática:** Mantener `router.refresh()` pero combinado con Suspense boundaries del Fix 5B. Con Suspense, `router.refresh()` muestra los skeletons inmediatamente mientras se re-fetchean los datos, eliminando el bloqueo percibido.

### Solución B — Suspense boundaries en dashboard/page.tsx

Separar el dashboard en componentes async independientes con Suspense.

**⚠️ Nota sobre deduplicación de fetches:** Si `StatsCards` y `MonthlyChart` hacen fetch al mismo endpoint `/transactions/stats`, Next.js 15 [deduplica automáticamente](https://nextjs.org/docs/app/building-your-application/caching#request-memoization) requests `fetch()` con la misma URL durante un mismo render pass. Para que esto funcione, ambos componentes deben usar **exactamente la misma URL y opciones de fetch**.

**Alternativa más simple:** Hacer un solo fetch en el page y pasar datos como props. Esto es incompatible con Suspense granular pero evita la complejidad:

```typescript
// Opción A: Suspense granular (más complejo, mejor UX)
export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <MonthlyChart />
      </Suspense>
      <Suspense fallback={<TransactionsSkeleton />}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}

// Opción B: Fetch único + Promise.all (más simple, suficiente)
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return <NoAuthFallback />;

  const [stats, recentFour] = await Promise.all([
    fetchStats(token),
    fetchRecentTransactions(token),
  ]);

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />
      <MonthlyChart months={stats?.monthly} />
      <RecentTransactions transactions={recentFour} />
    </div>
  );
}
```

**Recomendación:** Usar **Opción B** (fetch único + `Promise.all`). El win principal viene de Fix #3 (reducir payload de 250KB a 2KB). La diferencia entre streaming con Suspense y `Promise.all` es de ~50-100ms con el endpoint optimizado — no justifica la complejidad adicional de crear skeletons y componentes async separados para este caso.

### Nota de implementación
Los Server Components dentro de Suspense deben leer el token desde cookies usando `cookies()` de `next/headers`. Extraer a un helper `getAuthToken()` reutilizable:

```typescript
// lib/auth.ts
import { cookies } from "next/headers";

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("auth-token")?.value;
}
```

### Impacto esperado
- Con Opción B: dashboard carga en ~200-500ms (vs 2-8s actual)
- Con Opción A: skeletons aparecen en 0ms, datos en ~200ms
- Sync con Suspense: `router.refresh()` muestra skeletons en vez de bloquear

---

## Fix #6 — Token en query parameter (Seguridad)

### Archivos
- `backend/app/routers/transactions.py` (cambiar autenticación)
- `frontend/app/dashboard/page.tsx` (enviar token en header)
- `frontend/components/layouts/DashboardShell.tsx` (enviar token en header)

### Problema
El JWT se pasa como query parameter (`?token=...`) en todas las llamadas API. Esto expone el token en:
- Logs del servidor (access logs registran la URL completa)
- Historial del browser
- Headers `Referer` si hay navegación
- Cualquier proxy intermedio

### Solución

**Backend — Aceptar token desde header `Authorization`:**

```python
from fastapi import Header

def get_current_user(
    token: str = Query(None),
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    # Priorizar header, fallback a query param para retrocompatibilidad
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization[7:]
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=401, detail="Token required")

    auth_service = AuthService(db)
    user = auth_service.get_current_user(auth_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
```

**Frontend — Enviar token en header (Server Components):**
```typescript
// En page.tsx (Server Component — usa INTERNAL_API_URL)
async function fetchStats(token: string) {
  const res = await fetch(`${API_URL}/transactions/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  // ...
}
```

**Frontend — Enviar token en header (Client Components):**
```typescript
// En DashboardShell.tsx
const handleSync = async () => {
  const token = getToken();
  const res = await fetch(`${API_URL}/transactions/sync?max_emails=200&force_full_sync=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  // ...
};
```

### Impacto esperado
- Eliminación de exposición del JWT en URLs
- Retrocompatibilidad mantenida durante migración (acepta ambos)

---

## Orden de implementación recomendado

| Prioridad | Fix | Impacto | Dificultad | Dependencias |
|-----------|-----|---------|------------|--------------|
| 1 | Fix #2 — Batch insert | Altísimo (elimina 50s de latencia) | Media | Ninguna |
| 2 | Fix #4 — Índices DB | Alto (todas las queries) | Baja | Ninguna |
| 3 | Fix #3 — Endpoint stats | Alto (carga dashboard) | Media | Fix #4 (para queries rápidas) |
| 4 | Fix #6 — Token seguridad | Seguridad | Baja | Fix #3 (aplicar al nuevo endpoint) |
| 5 | Fix #1 — Flatten thread pool | Medio | Baja | Ninguna |
| 6 | Fix #5 — Suspense / UX | Medio (UX) | Media | Fix #3 (requiere endpoint stats) |

**Nota:** Fix #1 y Fix #2 son independientes y pueden implementarse en paralelo. Fix #3 depende de Fix #4 para máximo beneficio. Fix #5 depende de Fix #3.

---

## Tests a ejecutar después de cada fix

```bash
# Backend (desde /Users/diego/Documents/Chauchero/backend)
cd backend && python -m pytest tests/ -v

# Verificar que el sync sigue funcionando
curl -X POST http://localhost:8000/transactions/sync \
  -H "Authorization: Bearer <token>" \
  -d "max_emails=10"

# Verificar nuevo endpoint stats (después de Fix #3)
curl http://localhost:8000/transactions/stats \
  -H "Authorization: Bearer <token>"

# Frontend
cd frontend && npm run build && npm run dev

# Verificar migraciones (Fix #4)
cd backend && alembic upgrade head && alembic check
```

---

## Notas importantes para el agente implementador

1. **No usar localStorage nunca** — el proyecto usa cookies para todo estado persistido
2. **El ORM es SQLAlchemy síncrono** — no asyncpg ni greenlet tricks, solo threading
3. **Tailwind v4** — no hay `tailwind.config.ts`, los tokens están en `app/globals.css`
4. **No hay shadcn/ui CLI** — componentes implementados a mano con clases CSS
5. **Cookies del JWT**: el token se llama `auth-token`, el tema `ch-theme`
6. **Alembic**: las migraciones están en `backend/alembic/versions/`, correr desde `backend/`
7. **El endpoint `/transactions/stats` es nuevo** — necesita schema `DashboardStatsResponse` en schemas
8. **Fix #2**: `_get_or_create_account()` DEBE usar `db.flush()` en vez de `db.commit()` para no romper la atomicidad del batch
9. **Fix #3**: Usar `case()` de SQLAlchemy, NO `func.sum(...).filter(...)` que no es sintaxis válida
10. **Fix #3**: El endpoint `/stats` debe registrarse ANTES de `/{transaction_id}` en el router
11. **Fix #4**: `op.drop_index()` requiere `table_name` — no omitirlo en downgrade
12. **`datetime.utcnow()` está deprecado** desde Python 3.12 — usar `datetime.now(timezone.utc)` en los archivos que se toquen
13. **Fix #6**: Mantener retrocompatibilidad con query param `token` mientras se migran los clientes
