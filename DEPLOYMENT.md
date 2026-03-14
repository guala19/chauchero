# Deployment Guide

Guide for deploying Chauchero to production.

## Recommended Stack

- **Backend**: Railway, Render, or Fly.io
- **Database**: Neon, Supabase, or Railway PostgreSQL
- **Frontend**: Vercel or Netlify

## Option 1: Vercel + Railway (Recommended)

### Frontend on Vercel (Free)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. Configure:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
6. Deploy

### Backend on Railway ($5/month)

1. Go to [railway.app](https://railway.app)
2. New Project > Deploy from GitHub repo
3. Add PostgreSQL database (click + > Database > PostgreSQL)
4. Configure backend service:
   - Root Directory: `backend`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SECRET_KEY=<generate new one>
   GOOGLE_CLIENT_ID=<your-id>
   GOOGLE_CLIENT_SECRET=<your-secret>
   GOOGLE_REDIRECT_URI=https://your-backend.railway.app/auth/google/callback
   FRONTEND_URL=https://your-app.vercel.app
   ENVIRONMENT=production
   ```
6. Deploy
7. Run migrations:
   ```bash
   railway run alembic upgrade head
   ```

### Update Google OAuth

In Google Cloud Console:
1. Add production redirect URI:
   ```
   https://your-backend.railway.app/auth/google/callback
   ```
2. Add authorized domain:
   ```
   your-app.vercel.app
   ```

## Option 2: All on Render

### Database on Render (Free)

1. Go to [render.com](https://render.com)
2. New PostgreSQL (Free tier available)
3. Note connection details

### Backend on Render ($7/month)

1. New Web Service
2. Connect GitHub repository
3. Configure:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt && alembic upgrade head`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (same as Railway)

### Frontend on Render (Free)

1. New Static Site
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `.next`

## Environment Variables Checklist

### Backend Production Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Security (GENERATE NEW KEY!)
SECRET_KEY=<new-key-different-from-dev>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth
GOOGLE_CLIENT_ID=<your-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_REDIRECT_URI=https://your-backend-domain.com/auth/google/callback

# Application
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
ENVIRONMENT=production

# Redis (optional, for Celery)
REDIS_URL=redis://...
```

### Frontend Production Variables

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## Post-Deployment Checklist

- [ ] Backend health check works: `https://your-backend.com/health`
- [ ] API docs accessible: `https://your-backend.com/docs`
- [ ] Frontend loads: `https://your-frontend.com`
- [ ] Google OAuth flow works end-to-end
- [ ] Transaction sync works with real Gmail
- [ ] Database migrations applied
- [ ] Environment variables are production-safe (no dev secrets)

## Security Hardening

### Production Settings

1. **Update CORS**:
   ```python
   # backend/app/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[settings.FRONTEND_URL],  # Only your frontend
       allow_credentials=True,
       allow_methods=["GET", "POST", "PATCH"],  # Specific methods
       allow_headers=["*"],
   )
   ```

2. **Rate Limiting** (add to requirements.txt):
   ```bash
   pip install slowapi
   ```

   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address
   
   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   
   @router.post("/transactions/sync")
   @limiter.limit("10/minute")  # Max 10 syncs per minute
   async def sync_transactions(...):
       ...
   ```

3. **HTTPS Only**:
   - Both Railway and Vercel provide HTTPS automatically
   - Update OAuth redirect URI to use `https://`

4. **Token Encryption**:
   - Gmail refresh tokens should be encrypted in DB
   - Consider using `cryptography.fernet` for encryption at rest

### Monitoring

**Backend Health Checks:**
```python
# backend/app/routers/health.py
@router.get("/health/db")
async def check_database(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except:
        return {"status": "unhealthy", "database": "disconnected"}
```

**Logging:**
```python
# backend/app/main.py
import logging

logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

## Backup Strategy

### Database Backups

**Railway:**
- Automatic daily backups included
- Manual backup: `railway run pg_dump > backup.sql`

**Render:**
- Manual backups via dashboard
- Or use `pg_dump` with connection string

### Restore Process

```bash
# Download backup
railway run pg_dump -Fc > backup.dump

# Restore (if needed)
pg_restore -d $DATABASE_URL backup.dump
```

## Scaling Considerations

### Performance Tips

1. **Database Indexes** (already included):
   - `users.email` (unique index)
   - `transactions.email_id` (unique index)
   - `parser_rules.bank_name` (index)

2. **Query Optimization**:
   - Pagination on transaction lists
   - Lazy loading for dashboard
   - Cache supported banks list

3. **Background Jobs** (when needed):
   - Use Celery + Redis for scheduled sync
   - Or use Railway/Render cron jobs

### Cost at Scale

| Users | Gmail API | Hosting | Database | Total/month |
|-------|-----------|---------|----------|-------------|
| 10    | $0        | $5      | $0       | $5          |
| 100   | $0        | $10     | $10      | $20         |
| 1000  | $0        | $50     | $25      | $75         |
| 10000 | $0        | $200    | $100     | $300        |

Gmail API stays free at any scale (15k quota/user/min is more than enough).

## Domain Setup (Optional)

1. Buy domain (e.g., `chauchero.cl`)
2. Point to Vercel (frontend):
   - Add CNAME: `www` → `cname.vercel-dns.com`
3. Point to Railway/Render (backend):
   - Add CNAME: `api` → `your-app.railway.app`
4. Update environment variables with new domains
5. Update Google OAuth redirect URIs

## Troubleshooting

**502 Bad Gateway:**
- Check backend logs for crashes
- Verify DATABASE_URL is correct
- Check migrations ran successfully

**CORS Errors:**
- Verify FRONTEND_URL in backend .env
- Check CORS middleware settings

**OAuth Errors:**
- Verify redirect URI matches exactly (http vs https)
- Check client ID/secret are correct
- Verify Gmail API is enabled in Google Console

**Slow Sync:**
- Check Gmail API quotas
- Optimize email query (use after_date)
- Consider pagination or batch processing
