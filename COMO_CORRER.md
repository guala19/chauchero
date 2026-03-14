# 🚀 Cómo Correr Chauchero

## ✅ Ya está todo configurado

- ✅ Google OAuth configurado
- ✅ PostgreSQL instalado y corriendo
- ✅ Base de datos creada
- ✅ Migraciones aplicadas
- ✅ Dependencias instaladas

---

## Opción 1: Script Automatizado (Recomendado)

Abre UNA terminal y ejecuta:

```bash
cd /Users/diego/Documents/Chauchero
./dev.sh
```

Esto iniciará automáticamente:
- Backend en http://localhost:8000
- Frontend en http://localhost:3000

---

## Opción 2: Manual (2 Terminales)

### Terminal 1 - Backend

```bash
cd /Users/diego/Documents/Chauchero/backend
./venv/bin/uvicorn app.main:app --reload
```

Verás:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2 - Frontend

```bash
cd /Users/diego/Documents/Chauchero/frontend
npm run dev
```

Verás:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
```

---

## Ahora úsalo!

1. **Abre** http://localhost:3000 en tu navegador

2. **Click** en "Continue with Google"

3. **Autoriza** acceso a Gmail (solo lectura)

4. En el dashboard, **click "Sync Now"**

5. **¡Listo!** Verás tus transacciones de Banco de Chile

---

## URLs Importantes

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## Si algo falla

### Backend no inicia
```bash
# Verifica que Postgres esté corriendo
brew services list | grep postgres

# Debería decir "started"
```

### Frontend no inicia
```bash
# Reinstala dependencias
cd frontend
rm -rf node_modules
npm install
```

### No aparecen transacciones
- Asegúrate de tener emails de Banco de Chile en tu Gmail
- Revisa los logs del backend (terminal 1) para ver errores
- Prueba el parser: `cd backend && ./venv/bin/python scripts/test_parser.py`

---

## Para detener

**Si usaste `./dev.sh`:**
```bash
# Encuentra los procesos
ps aux | grep uvicorn
ps aux | grep next

# Mata los procesos
pkill -f uvicorn
pkill -f next
```

**Si usaste terminal manual:**
- Presiona `Ctrl+C` en cada terminal

---

## Próximos pasos

Una vez que funcione:
1. Revisa tus transacciones
2. Verifica que el parsing sea correcto
3. Lee `CONTRIBUTING.md` para agregar más bancos
4. Personaliza las categorías

**¡Disfruta tu spending tracker!** 🎉
