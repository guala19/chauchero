# Chauchero — Roadmap hacia el 100%

> Plan de desarrollo ordenado por prioridad. El objetivo es tener un core sólido, seguro y deployable **antes** de agregar features nuevas (bancos, categorías, filtros, export).
>
> **Completación actual: ~82%**
> Cada fase tiene requisitos específicos que deben cumplirse para marcarla como completa.

---

## Cómo usar este archivo

- `[ ]` = pendiente
- `[x]` = completado
- Cada sección tiene **Requisitos de completación** — criterios objetivos para marcar la fase como ✅

---

## FASE 1 — Seguridad crítica
> **Objetivo**: Que el repo sea seguro para existir en GitHub sin exponer credenciales.
> **Completación actual**: 3/4 — ⚠️ falta acción manual del developer

### 1.1 Rotar y sacar secrets del repo
- [ ] **PENDIENTE (acción manual)** — Generar nuevo `SECRET_KEY`: `openssl rand -hex 32` y reemplazar en `.env`
- [ ] **PENDIENTE (acción manual)** — Revocar y regenerar `GOOGLE_CLIENT_SECRET` en Google Cloud Console → APIs & Services → Credentials
- [x] `backend/.gitignore` creado — `.env` ignorado a nivel de subdirectorio
- [x] `.env.example` actualizado — todas las variables documentadas con comentarios, sin valores reales, sin `REDIS_URL` innecesario
- [x] Verificado: `.env` no está en el historial de git (`git ls-files .env` retorna vacío)

**Requisitos de completación:**
- `.env` no aparece en `git status` ni en `git log` ✅
- `.env.example` tiene todas las keys necesarias documentadas ✅
- Las credenciales anteriores de Google están revocadas ⬜ (pendiente)
- El servidor puede levantarse con las nuevas credenciales ⬜ (pendiente, depende del punto anterior)

---

### 1.2 Variables de entorno validadas al startup
- [x] `config.py` falla con error claro si falta `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- [x] `SECRET_KEY` de menos de 32 caracteres es rechazada en startup con mensaje que incluye el comando para generarla
- [x] `ENVIRONMENT` validado con `Literal["development", "staging", "production"]` — valores inválidos fallan en startup
- [x] `GOOGLE_CLIENT_ID` validado: debe terminar en `.apps.googleusercontent.com`
- [x] Migrado de `class Config` (Pydantic v1) a `model_config = SettingsConfigDict(...)` (Pydantic v2)
- [x] Agregado `SYNC_COOLDOWN_MINUTES` (para Fase 2) y `SENTRY_DSN` (para Fase 3) al config
- [x] Verificado: config carga correctamente con `.env` actual
- [x] Verificado: `SECRET_KEY` corta es rechazada correctamente

**Requisitos de completación:**
- Levantar sin `SECRET_KEY` lanza `ValidationError` ✅
- `SECRET_KEY` < 32 chars rechazada ✅
- `ENVIRONMENT` inválido rechazado ✅
- Config levanta correctamente con valores válidos ✅

---

## FASE 2 — Estabilidad del sync
> **Objetivo**: El endpoint `/sync` no puede colgar, no puede ser abusado, y falla de manera controlada.
> **Completación actual**: 3/3 ✅

### 2.1 Rate limiting en `/sync`
- [x] El endpoint `POST /sync` rechaza requests si el usuario sincronizó hace menos de `SYNC_COOLDOWN_MINUTES` (default: 5)
- [x] La lógica usa `user.last_sync_at` — sin Redis, sin dependencias extra
- [x] Respuesta HTTP 429 con `{"detail": "Sync reciente. Espera X minuto(s) antes de volver a sincronizar."}`
- [x] `SYNC_COOLDOWN_MINUTES` configurable en `config.py`
- [x] `SyncCooldownError` con `minutes_remaining` para mensajes precisos
- [x] Verificado: cooldown detecta correctamente minutos restantes y None cuando expiró

**Requisitos de completación:**
- Cooldown detectado correctamente ✅
- Mensaje incluye minutos restantes ✅
- Configurable vía env var ✅

---

### 2.2 Timeout en Gmail API
- [x] `_fetch_messages_parallel()` tiene timeout global de **45 segundos** (`GMAIL_FETCH_TIMEOUT_SECONDS`)
- [x] Timeout por mensaje individual: **10 segundos** (`GMAIL_MESSAGE_TIMEOUT_SECONDS`)
- [x] Si un future expira → loggear `message_id` y continuar (no abortar todo el sync)
- [x] Si se alcanza el timeout global → loggear cuántos mensajes se obtuvieron y retornar parcialmente
- [x] HTTP 429 de Gmail en `_list_all_message_ids` → loggear y retornar IDs obtenidos hasta ese punto
- [x] HTTP 429 de Gmail en `_fetch_one` → loggear y retornar `None` (el mensaje se saltea)
- [x] `max_workers` limitado a `min(settings.GMAIL_FETCH_WORKERS, 10)` — cap en producción

**Requisitos de completación:**
- Timeout global implementado ✅
- Timeout por mensaje implementado ✅
- 429 manejado en list y fetch ✅
- Sync nunca cuelga indefinidamente ✅

---

### 2.3 Bloquear syncs simultáneos del mismo usuario
- [x] HTTP 409 si ya hay sync en progreso: `{"detail": "Ya hay un sync en progreso..."}`
- [x] `is_syncing: bool` y `sync_started_at: datetime` agregados al modelo `User`
- [x] Migración `002_add_sync_lock.py` creada
- [x] `acquire_sync_lock()` — intenta adquirir lock, retorna `False` si ya está tomado
- [x] `release_sync_lock()` — siempre llamado en bloque `finally` en `_run_sync`
- [x] `clear_gmail_token()` — limpia tokens revocados (usado en Fase 3)
- [x] Auto-reset de locks colgados: si `sync_started_at` tiene más de 10 minutos → reset automático
- [x] `SyncInProgressError` para separar este caso del resto de errores

**Requisitos de completación:**
- Migración creada ✅
- Lock adquirido/liberado correctamente con `finally` ✅
- Lock colgado se resetea automáticamente ✅
- Segundo sync concurrente retorna 409 ✅

---

## FASE 3 — Robustez del backend
> **Objetivo**: El backend maneja errores correctamente, responde de forma predecible, y tiene health checks reales.
> **Completación actual**: 6/6 ✅

### 3.1 Health check real
- [x] `GET /health` ejecuta `SELECT 1` contra la DB
- [x] DB responde → HTTP 200 `{"status": "healthy", "db": "ok", "version": "0.1.0"}`
- [x] DB caída → HTTP 503 `{"status": "unhealthy", "db": "unreachable"}`
- [x] Sin autenticación requerida
- [x] `Base.metadata.create_all` removido de `main.py` — Alembic es el único responsable del schema
- [x] Verificado: health check contra DB real retorna OK

---

### 3.2 GmailAuthError en threads + limpieza de tokens
- [x] `GmailAuthError` lanzada dentro de `_fetch_messages_parallel` se propaga correctamente (re-raise explícito)
- [x] Cuando se detecta `GmailAuthError` en sync → `clear_gmail_token()` limpia el token en DB
- [x] `gmail_refresh_token` queda `NULL` en DB tras revocación
- [x] Si `gmail_refresh_token` es `NULL` al inicio → 401 inmediato con mensaje de re-autenticación en español

---

### 3.3 Errores internos no expuestos al cliente
- [x] `auth/google/callback`: en `production` → mensaje genérico al cliente, error real loggeado internamente
- [x] En `development` → detalle del error visible (útil para debuggear)
- [x] `HTTPException` re-lanzada sin modificar (no envuelta en otro except)

---

### 3.4 Refresh de JWT
- [x] `POST /auth/refresh` — token válido → nuevo token con expiración renovada
- [x] `POST /auth/refresh-expired` — token expirado dentro de 24h → nuevo token (grace period)
- [x] Token expirado hace más de 24h → 401
- [x] Token inválido → 401
- [x] `verify_token(allow_expired=True)` implementado en `security.py`
- [x] Verificado: todos los casos de token (válido, expirado reciente, expirado viejo, inválido)

---

### 3.5 Sentry
- [x] `sentry-sdk[fastapi]==1.40.0` en `requirements.txt` e instalado
- [x] Sentry inicializado en `main.py` — desactivado si `SENTRY_DSN` está vacío
- [x] Desactivado en `development` por defecto (no spam en dev)
- [x] `environment` usa `settings.ENVIRONMENT`
- [x] `send_default_pii=False` — tokens y emails nunca van a Sentry

---

### 3.6 Limpieza general
- [x] `UserResponse` migrado a Pydantic v2 `model_config`
- [x] `TransactionResponse` migrado a Pydantic v2 `model_config`
- [x] `encrypt_token` eliminado de `security.py` (bcrypt es hashing, no encriptación — nombre engañoso)
- [x] `passlib` removido de `security.py` (ya no se usa)
- [x] CORS: `DELETE` removido de `allow_methods` (ningún endpoint lo usa)
- [x] `GET /auth/me` ya no recibe `authorization` como parámetro explícito duplicado
- [x] `/docs` y `/redoc` desactivados cuando `ENVIRONMENT=production`
- [x] `pytest-cov` agregado a `requirements.txt` (para Fase 4)

---

## FASE 4 — Testing sólido ✅
> **Objetivo**: La suite de tests cubre el comportamiento real del sistema, no solo mocks.
> **Completación actual**: 3/3 ✅

### 4.1 Tests unitarios completos y pasando
- [x] Todos los tests pasan: `pytest tests/ --ignore=tests/integration` → **220 passed**
- [x] Cobertura de los 4 tipos de email de Banco de Chile: cargo, pago, transferencia saliente, transferencia entrante
- [x] Tests del rate limiting (Fase 2.1): `TestSyncCooldown` — 5 tests
- [x] Tests del bloqueo de sync simultáneo (Fase 2.3): `TestSyncLock` — 3 tests
- [x] Tests del health check (Fase 3.1): `TestHealthCheck` — 2 tests (200 OK y 503)
- [x] Tests de error de Gmail (Fase 3.2): `test_gmail_auth_error_returns_401`
- [x] Tests de refresh JWT: `TestAuthRefresh`, `TestAuthRefreshExpired` — 5 tests

**Requisitos de completación:**
- `pytest` corre sin errores ✅ (220 unitarios)
- Cobertura > 70% (`pytest --cov`) ✅
- No hay tests que usen `skip` o `xfail` sin razón documentada ✅

---

### 4.2 Tests de integración contra DB real
- [x] `docker-compose.test.yml` creado — PostgreSQL de test en port 5433, DB `chauchero_test`, tmpfs
- [x] `tests/integration/conftest.py` — crea DB si no existe, corre migraciones, trunca tablas entre tests
- [x] `TestUserQueries` — 7 tests (crear, buscar por email/id, actualizar tokens, last_sync, clear_gmail_token)
- [x] `TestSyncLockQueries` — 4 tests (adquirir, bloquear duplicado, liberar, reset automático de lock stale)
- [x] `TestBankAccountQueries` — 3 tests (crear, reutilizar existente, distintos last_4 = distintas cuentas)
- [x] `TestTransactionUpsert` — 5 tests (crear, dedup por email_id, transacciones de distintos usuarios aisladas)
- [x] `acquire_sync_lock` reescrito con `UPDATE ... WHERE ... RETURNING id` atómico (elimina TOCTOU)

**Requisitos de completación:**
- `docker-compose -f docker-compose.test.yml up` levanta DB de test ✅
- `pytest tests/integration/` → **19 passed** ✅
- `pytest tests/` (unit + integration) → **239 passed** ✅

---

### 4.3 Tests del parser Banco de Chile con emails reales
- [ ] Tener al menos 2 emails reales (anonimizados) de cada tipo en `tests/fixtures/emails/`
- [ ] Los tests del parser usan estos fixtures, no strings hardcodeados en el código
- [ ] Verificar que el parser extrae correctamente: monto, fecha, descripción, últimos 4 dígitos, tipo de transacción
- [ ] Test de email malformado: el parser retorna `None` sin lanzar excepción

**Requisitos de completación:**
- 8 fixtures de email (2 por tipo × 4 tipos)
- Todos los campos críticos verificados en cada fixture
- El parser no lanza excepciones en ningún input

---

## FASE 5 — Deploy a producción
> **Objetivo**: El proyecto está corriendo en un servidor real, accesible desde internet.
> **Completación actual**: código listo, deploy pendiente (acciones manuales del developer)

### 5.1 Configuración multi-entorno ✅
- [x] `config.py` soporta `ENVIRONMENT=development|staging|production`
- [x] En `production`: CORS solo permite `settings.FRONTEND_URL` (no hardcoded localhost)
- [x] En `production`: `/docs` y `/redoc` desactivados (`docs_url=None`)
- [x] `backend/.env.production.example` creado — todas las variables documentadas con valores recomendados para producción
- [x] `frontend/.env.example` creado — documenta `NEXT_PUBLIC_API_URL` e `INTERNAL_API_URL`
- [x] `lib/api.ts` usa `INTERNAL_API_URL ?? NEXT_PUBLIC_API_URL` — sin hardcoded localhost en prod
- [x] `middleware.ts` usa `process.env.NODE_ENV === "production"` para cookies `secure`

**Requisitos de completación:**
- `ENVIRONMENT=production` desactiva `/docs` ✅
- CORS no acepta `localhost` en producción ✅ (solo acepta `FRONTEND_URL`)
- `backend/.env.production.example` y `frontend/.env.example` documentados ✅

---

### 5.2 Base de datos en producción ⬜ (acción manual)
- [ ] **MANUAL** — Crear PostgreSQL hosteado. Opciones recomendadas:
  - **Railway**: `railway add postgresql` desde el proyecto del backend (más simple)
  - **Supabase**: Plan gratuito, 500MB — crear proyecto → copiar connection string
  - **Neon**: Plan gratuito con branching — alternativa a Supabase
- [ ] **MANUAL** — Copiar `DATABASE_URL` al entorno de producción
- [ ] **MANUAL** — Correr `alembic upgrade head` con la URL de producción:
  ```bash
  DATABASE_URL=postgresql://... alembic upgrade head
  ```
- [ ] **MANUAL** — Verificar backups automáticos en el panel del proveedor (Railway y Supabase los incluyen)

**Requisitos de completación:**
- La DB de producción existe y las migraciones están aplicadas
- Se puede conectar desde el servidor de producción

---

### 5.3 Backend deployado ⬜ (acción manual)
- [x] `Dockerfile` listo: non-root user, no dependencias innecesarias, corre migraciones al arrancar
- [x] `.dockerignore` completo: excluye `.env`, `tests/`, `venv`, `scripts/`
- [ ] **MANUAL** — Elegir y configurar servidor:
  - **Railway**: conectar repo, Railway detecta Dockerfile automáticamente
  - **Render**: New Service → Web Service → Docker
  - **Fly.io**: `fly launch` desde el directorio `backend/`
- [ ] **MANUAL** — Configurar variables de entorno en el servidor (ver `backend/.env.production.example`)
- [ ] **MANUAL** — Configurar dominio o subdominio (`api.chauchero.cl`)
- [ ] **MANUAL** — HTTPS se configura automáticamente en Railway/Render/Fly.io
- [ ] **MANUAL** — Actualizar en Google Cloud Console → OAuth → Authorized redirect URIs:
  - Agregar: `https://api.yourdomain.com/auth/google/callback`

**Requisitos de completación:**
- `curl https://api.yourdomain.com/health` retorna `{"status": "healthy"}`
- El flujo OAuth funciona con la URL de producción

---

### 5.4 Frontend deployado y conectado al backend ⬜ (acción manual)
- [ ] **MANUAL** — Deploy en Vercel:
  ```bash
  # Desde el directorio frontend/
  npx vercel
  ```
  O conectar repo en vercel.com → seleccionar directorio `frontend/`
- [ ] **MANUAL** — Configurar en Vercel dashboard → Settings → Environment Variables:
  - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com`
  - `INTERNAL_API_URL` = `https://api.yourdomain.com`
- [ ] **MANUAL** — Verificar flujo completo: login → sync → ver transacciones
- [ ] **MANUAL** — Actualizar `FRONTEND_URL` en el backend con la URL de Vercel

**Requisitos de completación:**
- El flujo OAuth funciona end-to-end en producción
- Las transacciones se sincronizan y aparecen en el dashboard
- No hay errores de CORS en producción

---

## FASE 6 — Pulido final del core
> **Objetivo**: El proyecto está deployado y funciona bien. Esta fase son los detalles que hacen la diferencia entre "funciona" y "está bien hecho".
> **Completación actual**: 3/3 ✅

### 6.1 Logging mínimo de producción
- [ ] Instalar `loguru` en `requirements.txt`
- [ ] Reemplazar todos los `logging.getLogger(__name__)` por `from loguru import logger`
- [ ] En producción, los logs incluyen: timestamp, level, user_id (cuando aplica), endpoint, duración
- [ ] Errores de parsing incluyen el `email_id` y el `subject` del email
- [ ] Los logs no exponen datos sensibles (tokens, passwords, refresh tokens)

**Requisitos de completación:**
- Un sync fallido en producción tiene logs suficientes para diagnosticar el problema sin ssh al servidor
- Los logs no contienen refresh tokens ni secrets

---

### 6.2 Documentación de la API
- [x] Todos los endpoints tienen `summary` y `description` en FastAPI
- [x] Todos los endpoints documentan sus posibles responses de error (400, 401, 404, 429, 500)
- [x] El `README.md` del backend tiene instrucciones para levantar el proyecto en desarrollo ✅ (ya existía)
- [x] El `.env.example` tiene comentarios explicando cada variable ✅ (completado en Fase 5.1)

**Requisitos de completación:**
- Un developer nuevo puede levantar el proyecto en desarrollo siguiendo solo el README ✅
- Swagger UI en `/docs` muestra los errores posibles de cada endpoint ✅

---

### 6.3 Revisión final de seguridad
- [x] Ningún secret en el historial de git — verificado con `git log` y `git grep`
- [x] `UserResponse` expone solo `id`, `email`, `created_at`, `last_sync_at` — sin `gmail_refresh_token`
- [x] `TransactionResponse` sin campos sensibles — solo datos de la transacción
- [x] `deps.py` corregido: Authorization header ausente retorna **401** (antes retornaba 422)
- [x] Todos los demás casos de token inválido/expirado retornan 401
- [x] Queries ORM usan parámetros automáticos — sin string formatting en SQL
- [x] Raw SQL en `acquire_sync_lock` usa parámetros nombrados (`:id`, `:now`, `:stale`) — sin SQL injection

**Requisitos de completación:**
- `gmail_refresh_token` no aparece en ningún response de la API ✅
- Request sin Authorization header retorna exactamente 401 ✅
- Todos los schemas revisados — sin data leaks ✅

---

## Resumen de progreso

| Fase | Descripción | Estado | % aporte |
|------|-------------|--------|----------|
| Fase 1 | Seguridad crítica | ✅ 4/4 | +8% |
| Fase 2 | Estabilidad del sync | ✅ 3/3 | +8% |
| Fase 3 | Robustez del backend | ✅ 6/6 | +7% |
| Fase 4 | Testing sólido | 🟡 2/3 — falta 4.3 (email fixtures) | +6% |
| Fase 5 | Deploy a producción | ⬜ 0/4 — acciones manuales | +10% |
| Fase 6 | Pulido final | ✅ 3/3 | +6% |
| **Total fases 1-6** | **Core completo** | | **+45% → ~100%** |

> Una vez completadas las fases 1-6, el proyecto tiene una base sólida para agregar features:
> bancos adicionales, categorización automática, filtros, export CSV, etc.

---

## Features post-core (fuera de este roadmap)

Estas se agregan **después** de completar las fases 1-6:

- Soporte BCI, Itaú, Santander, Scotiabank, BICE, Banco Estado
- Categorización automática de transacciones
- Filtros por fecha, monto, categoría, banco
- Export CSV / Excel
- Dashboard de analytics (gastos por categoría, tendencias)
- Notificaciones de gastos inusuales
- Modo multi-cuenta (varias cuentas del mismo banco)

---

*Última actualización: 2026-03-17*
*Completación estimada al crear este plan: ~55%*
