# Quick Commands Reference

Frequently used commands for Chauchero development.

## Setup

```bash
# Initial setup (automated)
./setup.sh

# Or manual setup
cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cd frontend && npm install
```

## Development

```bash
# Start both services (automated)
./dev.sh

# Or start manually:
# Terminal 1 - Backend
cd backend
./venv/bin/uvicorn app.main:app --reload

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Database

```bash
# Start PostgreSQL
docker compose up -d

# Stop PostgreSQL
docker compose down

# View logs
docker compose logs postgres

# Check status
docker compose ps

# Run migrations
cd backend
./venv/bin/alembic upgrade head

# Create new migration
./venv/bin/alembic revision -m "description"

# Rollback migration
./venv/bin/alembic downgrade -1
```

## Testing

```bash
# Test parser (no Gmail needed)
cd backend
./venv/bin/python scripts/test_parser.py

# Run unit tests
./venv/bin/pytest

# Run specific test
./venv/bin/pytest tests/test_banco_chile_parser.py

# Run with verbose output
./venv/bin/pytest -v

# Run with coverage
./venv/bin/pytest --cov=app tests/
```

## API Testing

```bash
# Health check
curl http://localhost:8000/health

# Get API docs
open http://localhost:8000/docs

# List supported banks
curl http://localhost:8000/banks/supported

# Get current user (with token)
curl "http://localhost:8000/auth/me?token=YOUR_TOKEN"

# Sync transactions
curl -X POST "http://localhost:8000/transactions/sync?token=YOUR_TOKEN&max_emails=100"

# List transactions
curl "http://localhost:8000/transactions/?token=YOUR_TOKEN&limit=50"
```

## Code Quality

```bash
# Format Python code
cd backend
./venv/bin/black app/

# Lint Python
./venv/bin/flake8 app/

# Type check (if mypy installed)
./venv/bin/mypy app/

# Lint frontend
cd frontend
npm run lint

# Format frontend (if prettier installed)
npx prettier --write "**/*.{ts,tsx}"
```

## Git

```bash
# Initialize repo (if not done)
git init
git add .
git commit -m "Initial commit: Chauchero MVP"

# Create branch for new bank
git checkout -b add-parser-santander

# Commit new parser
git add backend/app/parsers/santander.py
git commit -m "Add Santander parser"
```

## Utilities

```bash
# Check ports in use
lsof -ti:8000  # Backend
lsof -ti:3000  # Frontend
lsof -ti:5432  # PostgreSQL

# Kill process on port
lsof -ti:8000 | xargs kill -9

# Generate new secret key
openssl rand -hex 32

# Count lines of code
find . -name "*.py" -not -path "*/venv/*" | xargs wc -l
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l

# Check Python version
python3 --version

# Check Node version
node --version

# Check Docker
docker --version
docker compose version
```

## Deployment

```bash
# Build Docker images
docker build -t chauchero-backend backend/
docker build -t chauchero-frontend frontend/

# Run with Docker
docker run -p 8000:8000 chauchero-backend
docker run -p 3000:3000 chauchero-frontend

# Deploy to Railway (after railway CLI installed)
railway up

# Deploy to Vercel
cd frontend
vercel deploy
```

## Troubleshooting

```bash
# View backend logs
tail -f /tmp/chauchero-backend.log

# View frontend logs
tail -f /tmp/chauchero-frontend.log

# Check database connection
psql -d chauchero_db -c "SELECT version();"

# Check environment variables
cd backend
cat .env | grep GOOGLE

# Reset database
docker compose down -v  # Removes volumes
docker compose up -d
cd backend && ./venv/bin/alembic upgrade head

# Clean install
rm -rf backend/venv frontend/node_modules
./setup.sh
```

## Quick Tasks

### Add a New Bank

```bash
# 1. Create parser file
cp backend/app/parsers/banco_chile.py backend/app/parsers/santander.py

# 2. Edit the file (update bank_name, email_domains, patterns)
code backend/app/parsers/santander.py

# 3. Add import
echo "from .santander import SantanderParser" >> backend/app/parsers/__init__.py

# 4. Test
cd backend
./venv/bin/python scripts/test_parser.py

# 5. Restart backend
# (If using --reload, it will auto-restart)
```

### Update Dependencies

```bash
# Backend
cd backend
./venv/bin/pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

### Export Data

```bash
# Export transactions to CSV (via psql)
psql -d chauchero_db -c "\COPY (SELECT * FROM transactions) TO 'transactions.csv' CSV HEADER"

# Or via API (when implemented)
curl "http://localhost:8000/transactions/export?token=$TOKEN&format=csv" > transactions.csv
```

## Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias chauchero-start='cd /Users/diego/Documents/Chauchero && ./dev.sh'
alias chauchero-test='cd /Users/diego/Documents/Chauchero/backend && ./venv/bin/pytest'
alias chauchero-backend='cd /Users/diego/Documents/Chauchero/backend && ./venv/bin/uvicorn app.main:app --reload'
alias chauchero-frontend='cd /Users/diego/Documents/Chauchero/frontend && npm run dev'
```

## Environment Variables

```bash
# View current settings
cd backend
cat .env

# Update a variable
echo "GOOGLE_CLIENT_ID=new-value" >> .env

# Or use sed
sed -i '' 's/old-value/new-value/' .env
```

## Monitoring

```bash
# Watch API logs in real-time
cd backend
./venv/bin/uvicorn app.main:app --reload --log-level debug

# Watch database queries
psql -d chauchero_db
# In psql:
# \set ECHO_ALL
# Then run your queries

# Monitor frontend build
cd frontend
npm run dev -- --turbo
```
