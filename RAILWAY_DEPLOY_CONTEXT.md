# Railway Deploy — Contexto del problema

## Objetivo
Hacer deploy del backend FastAPI de Chauchero en Railway.

## Estado actual
- Build de Docker: **exitoso** (~59s)
- Migraciones Alembic: **exitosas** (001 y 002 corren bien)
- Healthcheck en `/health`: **falla** — todos los intentos devuelven "service unavailable"
- Resultado: `1/1 replicas never became healthy`

## Variables de entorno configuradas en Railway

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:***@postgres.railway.internal:5432/railway` |
| `SECRET_KEY` | `l3RyGQvYXPllp2Tlo7FLTKjNuh9mz8wJvRqDPWSDsh/SyRxr1402MK` |
| `GOOGLE_CLIENT_ID` | `694372952707-sue9r9t2vgn5j0rlr54vvshm32vhm7u7.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `D7vqC9H2lp&>gqWjNK` |
| `GOOGLE_REDIRECT_URI` | ⚠️ Estaba en `http://localhost:8000/...` — debe cambiarse |

## Variables que faltan o están mal (pendiente de cambiar)

| Variable | Valor correcto |
|---|---|
| `GOOGLE_REDIRECT_URI` | `https://chauchero-production.up.railway.app/auth/google/callback` |
| `FRONTEND_URL` | `https://chauchero-production.up.railway.app` |
| `BACKEND_URL` | `https://chauchero-production.up.railway.app` |
| `ENVIRONMENT` | `production` |

## Problema para cambiar variables
- La UI de Railway no guarda los cambios al hacer click en "aceptar"
- Se intentó usar el Railway CLI (`railway variables set`) pero falla porque el proyecto no está linkeado
- `railway link` sin argumentos debería mostrar un menú interactivo (pendiente de probar)
- `railway link <URL>` falla — el CLI no acepta URLs como argumento

## Diagnóstico probable del healthcheck
El `/health` endpoint en `app/main.py` hace una query real a la DB (`SELECT 1`).
Si uvicorn crashea en startup (por variable faltante o inválida), el endpoint nunca responde
y Railway agota los 5 minutos de reintentos.

Los logs del contenedor (runtime) están cortados — solo se ve hasta las migraciones,
no hay log de uvicorn arrancando ni error de Python posterior.

## Archivos clave
- `backend/Dockerfile` — CMD: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}`
- `backend/app/main.py` — FastAPI app, endpoint `/health`
- `backend/app/core/config.py` — Settings con pydantic-settings, `settings = Settings()` al import
- `backend/app/.dockerignore` — excluye `.env` correctamente

## URL de producción
`https://chauchero-production.up.railway.app`

## Próximos pasos
1. Correr `railway link` (interactivo) para linkear el proyecto
2. Setear las 4 variables faltantes via CLI
3. Hacer redeploy
4. Revisar los runtime logs completos para confirmar que uvicorn levanta
