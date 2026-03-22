# CLAUDE.md — Chauchero

Chilean bank expense tracker. Parses Gmail notification emails to extract transactions. FastAPI + Next.js 15 + PostgreSQL.

## How to run

```bash
./dev.sh                    # Starts backend (:8000) + frontend (:3000) + Docker PostgreSQL
docker compose up -d        # PostgreSQL only
cd backend && ./venv/bin/uvicorn app.main:app --reload   # Backend only
cd frontend && npm run dev  # Frontend only (Turbopack)
```

## Rules

### Workflow
- Break features into small tasks. Run tests after each task before moving to the next.
- Backend tests run automatically before every commit (PreToolUse hook in `.claude/settings.json` — intercepts `git commit` commands).
- Run `cd frontend && npx tsc --noEmit` before committing frontend changes.

### Always
- Create Alembic migrations for ANY database schema change — never modify the DB directly
- Use cookies for all client-side persistence (auth, theme, preferences) — NEVER localStorage
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Use existing formatters from `frontend/lib/format.ts` (formatCLP, formatDate, etc.)
- Use existing constants from `frontend/lib/constants.ts` (NAV_ITEMS, TRANSACTION_STYLES, etc.)
- Test UI changes in both light and dark theme (toggle via `.dark` class on `<html>`)
- Use server components by default — add `"use client"` only when useState/useEffect/event handlers are needed
- When touching parsers, test with sample emails in `correos/` directory

### Never
- Don't create new markdown docs at root — there are already ~25, most outdated. Update existing ones or skip.
- Don't use `asChild` prop in shadcn components — shadcn v4 uses `render` prop instead (base-ui, not radix)
- Don't import from `@radix-ui` — this project uses `@base-ui/react`
- Don't add state management libraries (Redux, Zustand) — React hooks + URL params are sufficient
- Don't bypass sync cooldown (5 min) — it protects Gmail API quota
- Don't use `localhost` in `INTERNAL_API_URL` — use `127.0.0.1` to avoid IPv6 resolution delay
- Don't export non-layout symbols from Next.js App Router layout files
- Don't touch `frontend-testing/` unless explicitly asked — it's a sandbox

### Backend conventions
- Pydantic schemas for all request/response models (`app/schemas/`)
- SQLAlchemy ORM for queries, raw SQL only for atomic operations (sync lock pattern)
- structlog for logging — never use `print()`
- New bank parser = new file in `app/parsers/`, inherit `BankParser`, register in `__init__.py`
- UUIDs for all primary keys, `email_id` as unique constraint for dedup

### Frontend conventions
- shadcn/ui v4 (base-nova style, `components.json` is source of truth)
- Tailwind v4 with CSS variables defined in `app/globals.css` — use semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-ch-green`, etc.)
- Fonts: Geist Sans + Geist Mono (next/font/google) + Material Symbols Outlined
- CLP currency: `$ 1.234.567` (dot as thousands separator, es-CL locale)
- Path alias: `@/` → project root
- Data fetching: server components use `lib/api.ts` directly, client components go through `/api/[...path]` proxy

### Auth flow (don't break this)
- OAuth → backend callback → JWT → middleware sets `auth-token` httpOnly cookie
- Middleware proactively refreshes JWT when < 10 min remaining
- `/api/[...path]` catch-all proxies to backend with `Authorization: Bearer` header
- Non-httpOnly `ch-session=1` cookie for client-side auth detection only

## Testing

```bash
# Backend: unit + integration (80% coverage required by CI)
cd backend && ./venv/bin/pytest tests/ --ignore=tests/smoke -q --tb=short

# Backend: with coverage
cd backend && ./venv/bin/pytest tests/ --ignore=tests/smoke --cov=app --cov-fail-under=80 -q

# Parser testing without Gmail
cd backend && ./venv/bin/python scripts/test_parser.py

# Frontend: type check
cd frontend && npx tsc --noEmit
```

## Key gotchas
- shadcn v4 = `@base-ui/react`, NOT radix. No `asChild`. Use `render` prop on Tooltip/Trigger.
- Sidebar collapse is NOT persisted (intentional — resets on reload)
- Backend `config.py` validates all env vars at startup — missing vars = clear error, don't guess
- Gmail sync uses ThreadPoolExecutor (10 workers, 45s timeout) — don't make it synchronous
- Bulk upsert uses `INSERT ... ON CONFLICT DO NOTHING` on `email_id` — transactions are never duplicated
- Root-level markdown files are mostly from early development — trust the code, not the docs
