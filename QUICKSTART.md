# Quickstart Guide - Chauchero

El proyecto está completamente configurado. Solo necesitas completar estos pasos para empezar:

## Estado Actual

✅ Backend estructurado con FastAPI
✅ Frontend con Next.js
✅ Parser de Banco de Chile implementado
✅ Sistema de OAuth con Gmail listo
✅ Base de datos modelada
✅ Dependencias instaladas

## Lo que necesitas hacer:

### 1. Instalar Docker (si no lo tienes)

**macOS:**
```bash
brew install --cask docker
```

O descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop

**Alternativa sin Docker:**
Instala PostgreSQL localmente:
```bash
brew install postgresql@15
brew services start postgresql@15
createdb chauchero_db
```

Si usas Postgres local, actualiza `backend/.env`:
```
DATABASE_URL=postgresql://tu_usuario@localhost:5432/chauchero_db
```

### 2. Iniciar Base de Datos

**Con Docker:**
```bash
cd /Users/diego/Documents/Chauchero
docker compose up -d
```

**Verificar que está corriendo:**
```bash
docker compose ps
# O si es Postgres local:
psql -d chauchero_db -c "SELECT 1"
```

### 3. Configurar Google OAuth

1. Ve a https://console.cloud.google.com/
2. Crea un proyecto nuevo: "Chauchero"
3. Habilita Gmail API:
   - "APIs & Services" > "Library"
   - Busca "Gmail API" > "Enable"
4. Configura OAuth consent screen:
   - "APIs & Services" > "OAuth consent screen"
   - User type: "External"
   - App name: "Chauchero"
   - Scopes: Agregar `https://www.googleapis.com/auth/gmail.readonly`
5. Crea credenciales:
   - "APIs & Services" > "Credentials"
   - "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
   - Copia Client ID y Client Secret

6. Actualiza `backend/.env`:
```bash
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
```

### 4. Ejecutar Migraciones

```bash
cd backend
./venv/bin/alembic upgrade head
```

### 5. Iniciar Servicios

**Terminal 1 - Backend:**
```bash
cd /Users/diego/Documents/Chauchero/backend
./venv/bin/uvicorn app.main:app --reload
```

Verás:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Terminal 2 - Frontend:**
```bash
cd /Users/diego/Documents/Chauchero/frontend
npm run dev
```

Verás:
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
```

### 6. Probar la Aplicación

1. Abre http://localhost:3000
2. Click en "Continue with Google"
3. Autoriza acceso a Gmail (solo lectura)
4. En el dashboard, click "Sync Now"
5. Verás tus transacciones de Banco de Chile si tienes emails

## Verificar que Todo Funciona

**Backend API:**
- http://localhost:8000/docs - Documentación interactiva
- http://localhost:8000/health - Health check
- http://localhost:8000/banks/supported - Lista de bancos soportados

**Frontend:**
- http://localhost:3000 - Landing page
- http://localhost:3000/dashboard - Dashboard (requiere login)

## Troubleshooting

**Error: "Connection refused" en Postgres**
- Verifica que Docker está corriendo: `docker compose ps`
- O si es local: `brew services list | grep postgres`

**Error: "Invalid OAuth credentials"**
- Verifica que GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET estén en `backend/.env`
- Verifica que la redirect URI sea exacta en Google Console

**No se encuentran transacciones**
- Verifica que tienes emails de Banco de Chile en tu Gmail
- Revisa los logs del backend para ver errores de parsing
- Los emails deben contener palabras clave como "transacción", "compra", "cargo"

## Próximos Pasos

Una vez que funcione:
1. Agrega parsers para otros bancos (copia `banco_chile.py`)
2. Mejora el dashboard con filtros y gráficos
3. Implementa categorización automática
4. Configura auto-sync con Celery (opcional)

## Estructura de Archivos Clave

```
backend/app/
├── parsers/
│   ├── base.py              # ← Clase abstracta para parsers
│   └── banco_chile.py       # ← Parser Banco de Chile
├── services/
│   ├── gmail_service.py     # ← Interacción con Gmail API
│   ├── transaction_service.py  # ← Lógica de sync
│   └── auth_service.py      # ← OAuth y autenticación
├── routers/
│   ├── auth.py              # ← Endpoints de login
│   ├── transactions.py      # ← Endpoints de transacciones
│   └── banks.py             # ← Info de bancos soportados
└── models/                   # ← Modelos SQLAlchemy
```

## Agregar Nuevo Banco (Ejemplo: Santander)

```bash
# Crea el archivo
touch backend/app/parsers/santander.py
```

```python
# backend/app/parsers/santander.py
from .base import BankParser, ParsedTransaction, EmailData, parser_registry

class SantanderParser(BankParser):
    bank_name = "Santander"
    email_domains = ["santander.cl", "alertas.santander.cl"]
    subject_keywords = ["transacción", "compra"]
    
    def parse(self, email: EmailData) -> ParsedTransaction:
        # Implementa el parsing según formato de Santander
        content = email.body or ""
        
        # Extrae monto, fecha, descripción...
        # (Copia la estructura de banco_chile.py y ajusta los regex)
        
        return ParsedTransaction(...)

# Auto-registra
parser_registry.register(SantanderParser)
```

```python
# backend/app/parsers/__init__.py
# Agrega el import:
from .santander import SantanderParser
```

Reinicia el backend y listo - Santander estará soportado.
