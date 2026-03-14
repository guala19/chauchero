# Chauchero Backend

FastAPI backend for Chilean bank spending tracker.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Start PostgreSQL:
```bash
cd ..
docker-compose up -d
```

5. Run migrations:
```bash
alembic upgrade head
```

6. Start development server:
```bash
uvicorn app.main:app --reload
```

API will be available at http://localhost:8000

API documentation at http://localhost:8000/docs

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add authorized redirect URI: `http://localhost:8000/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

## Adding New Banks

To add support for a new bank:

1. Create a new parser in `app/parsers/`:

```python
from .base import BankParser, ParsedTransaction, EmailData, parser_registry

class NuevoBancoParser(BankParser):
    bank_name = "Nuevo Banco"
    email_domains = ["nuevobanco.cl"]
    subject_keywords = ["transacción", "compra"]
    
    def parse(self, email: EmailData) -> ParsedTransaction:
        # Implement parsing logic
        pass

# Register the parser
parser_registry.register(NuevoBancoParser)
```

2. Import it in `app/parsers/__init__.py`
3. Test with sample emails
4. Done! The parser auto-registers on import.

## Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```
