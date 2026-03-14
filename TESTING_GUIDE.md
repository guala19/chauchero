# Testing Guide - Chauchero

Guide for testing parsers and the application.

## Quick Test (Without Gmail)

Test the parser with sample data:

```bash
cd backend
./venv/bin/python scripts/test_parser.py
```

**Expected output:**
```
🚀 CHAUCHERO - Parser Testing Tool

Registered parsers: 1
  • Banco de Chile - bancochile.cl, notificaciones.bancochile.cl, alertas.bancochile.cl

Testing Banco de Chile Parser
────────────────────────────────────────────────────────────
Test: Compra con tarjeta de crédito
✓ Parser identified: Banco de Chile
📊 Parsed Transaction:
  Amount:           $25,990
  Date:             09/03/2026 00:00
  Description:      STARBUCKS PROVIDENCIA
  Type:             debit
  Card/Account:     ****4567
  Confidence:       100%
✅ Confidence Level: 100%
```

## Unit Tests

Run all tests:
```bash
cd backend
./venv/bin/pytest
```

Run specific test:
```bash
./venv/bin/pytest tests/test_banco_chile_parser.py -v
```

Run with coverage:
```bash
./venv/bin/pytest --cov=app tests/
```

## Testing with Real Emails

### Method 1: Use Your Gmail

1. Make sure you have Banco de Chile notifications in Gmail
2. Start the backend: `uvicorn app.main:app --reload`
3. Start the frontend: `npm run dev`
4. Login with Google
5. Click "Sync Now"
6. Check results

### Method 2: Manual Gmail API Test

Create a test script:

```python
# test_my_emails.py
from google.oauth2.credentials import Credentials
from app.services.gmail_service import GmailService
from app.parsers import parser_registry

# Your OAuth token (get from Google OAuth Playground)
credentials = Credentials(
    token=None,
    refresh_token="YOUR_REFRESH_TOKEN",
    token_uri="https://oauth2.googleapis.com/token",
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET"
)

gmail = GmailService(credentials)
emails = gmail.fetch_bank_emails(max_results=10)

print(f"Found {len(emails)} bank emails")

for email in emails:
    parser = parser_registry.get_parser_for_email(email)
    if parser:
        result = parser.parse(email)
        if result:
            print(f"✓ {result.description}: ${result.amount}")
        else:
            print(f"✗ Failed to parse: {email.subject}")
    else:
        print(f"⚠ No parser for: {email.sender}")
```

## Testing New Parsers

### Step 1: Collect Sample Emails

Forward 3-5 bank notification emails to yourself and save them.

### Step 2: Create Test Cases

```python
# tests/test_santander_parser.py
import pytest
from app.parsers.santander import SantanderParser
from app.parsers.base import EmailData
from datetime import datetime

@pytest.fixture
def santander_parser():
    return SantanderParser()

def test_parse_compra(santander_parser):
    email = EmailData(
        message_id="test_001",
        sender="alertas@santander.cl",
        subject="Compra con tu Tarjeta",
        body="""
        Realizaste una compra:
        Por: $18.500
        El: 09/03/2026 12:30
        En: SUPERMERCADO JUMBO
        Con tarjeta: ****5555
        """,
        date=datetime(2026, 3, 9, 12, 30)
    )
    
    result = santander_parser.parse(email)
    
    assert result is not None
    assert result.amount == Decimal("18500")
    assert "JUMBO" in result.description
    assert result.confidence >= 80
```

### Step 3: Run Tests

```bash
./venv/bin/pytest tests/test_santander_parser.py -v
```

### Step 4: Test with Real Emails

Update `scripts/test_parser.py` to include your samples, or create a custom test script.

## API Testing

### Using Swagger UI

1. Start backend: `uvicorn app.main:app --reload`
2. Open http://localhost:8000/docs
3. Test endpoints interactively

### Using curl

**Get supported banks:**
```bash
curl http://localhost:8000/banks/supported
```

**Health check:**
```bash
curl http://localhost:8000/health
```

**List transactions (requires auth token):**
```bash
TOKEN="your-jwt-token"
curl "http://localhost:8000/transactions/?token=$TOKEN&limit=10"
```

**Trigger sync:**
```bash
curl -X POST "http://localhost:8000/transactions/sync?token=$TOKEN&max_emails=50"
```

## Performance Testing

### Test Parser Speed

```python
# benchmark_parser.py
import time
from app.parsers.banco_chile import BancoChileParser
from app.parsers.base import EmailData

parser = BancoChileParser()
email = EmailData(...)  # Your sample

iterations = 1000
start = time.time()

for _ in range(iterations):
    parser.parse(email)

duration = time.time() - start
print(f"Parsed {iterations} emails in {duration:.2f}s")
print(f"Average: {duration/iterations*1000:.2f}ms per email")
```

**Expected**: <5ms per email

### Test Sync Performance

Monitor sync time with different email counts:

```bash
# Sync 10 emails
time curl -X POST "http://localhost:8000/transactions/sync?token=$TOKEN&max_emails=10"

# Sync 100 emails
time curl -X POST "http://localhost:8000/transactions/sync?token=$TOKEN&max_emails=100"
```

**Expected**: 
- 10 emails: ~2-5 seconds
- 100 emails: ~15-30 seconds

## Debugging Tips

### Enable Verbose Logging

```python
# backend/app/main.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Print Parser Debug Info

```python
# In your parser
def parse(self, email: EmailData):
    content = email.body or ""
    print(f"DEBUG: Parsing email from {email.sender}")
    print(f"DEBUG: Subject: {email.subject}")
    print(f"DEBUG: Content length: {len(content)}")
    
    amount = self._extract_amount(content)
    print(f"DEBUG: Extracted amount: {amount}")
    # ...
```

### Check Gmail API Response

```python
# In gmail_service.py
def fetch_bank_emails(self, ...):
    results = self.service.users().messages().list(...).execute()
    print(f"DEBUG: Gmail returned {len(results.get('messages', []))} messages")
    # ...
```

## Common Issues

### Parser Not Matching

**Symptom**: Email not being parsed
**Debug**:
```python
email = EmailData(...)
parser = BancoChileParser()
print(parser.matches_email(email))  # Should be True
```

**Common causes**:
- Email domain not in `email_domains`
- Subject doesn't contain keywords
- Check `sender` and `subject` values

### Amount Not Extracted

**Symptom**: Parser returns None
**Debug**:
```python
content = "Monto: $45.990"
pattern = r'Monto[:\s]+\$\s*([\d.,]+)'
match = re.search(pattern, content, re.IGNORECASE)
print(match.group(1) if match else "No match")
```

**Common causes**:
- Amount format different than expected
- Extra spaces or special characters
- Currency symbol variations

### Date Parsing Fails

**Symptom**: Transaction uses email date instead of transaction date
**Debug**:
```python
date_str = "09/03/2026"
from datetime import datetime
result = datetime.strptime(date_str, "%d/%m/%Y")
print(result)
```

**Common causes**:
- Date format mismatch (/ vs -)
- Month/day order different
- Extra characters in date string

## Test Checklist

Before deploying a new parser:

- [ ] Parser matches correct email domains
- [ ] Extracts amount correctly (tested with 5+ samples)
- [ ] Extracts date correctly (or falls back to email date)
- [ ] Extracts description/merchant
- [ ] Extracts card/account digits
- [ ] Determines transaction type correctly
- [ ] Confidence score is accurate
- [ ] Unit tests pass
- [ ] Tested with real emails
- [ ] Documentation updated

## Continuous Testing

### Watch Mode

```bash
# Backend tests
cd backend
./venv/bin/pytest-watch

# Or use pytest with watch
./venv/bin/pytest --watch
```

### Pre-commit Testing

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd backend
./venv/bin/pytest tests/
exit $?
```

```bash
chmod +x .git/hooks/pre-commit
```

## Testing in Production

### Monitor Parser Success Rate

```python
# Add to transaction_service.py
def get_parser_stats(self, user_id):
    total = self.db.query(Transaction).join(BankAccount).filter(
        BankAccount.user_id == user_id
    ).count()
    
    low_confidence = self.db.query(Transaction).join(BankAccount).filter(
        BankAccount.user_id == user_id,
        Transaction.parser_confidence < 80
    ).count()
    
    return {
        "total_transactions": total,
        "low_confidence": low_confidence,
        "success_rate": (total - low_confidence) / total * 100 if total > 0 else 0
    }
```

### Error Logging

```python
# Add to gmail_service.py
import logging
logger = logging.getLogger(__name__)

def _process_email(self, ...):
    try:
        # ... parsing logic
    except Exception as e:
        logger.error(f"Failed to parse email {email.message_id}: {e}")
        logger.error(f"Subject: {email.subject}")
        logger.error(f"Sender: {email.sender}")
        # Store failed email for manual review
```

## Integration Testing

Test full flow end-to-end:

```python
# tests/test_integration.py
async def test_full_sync_flow():
    # 1. Create test user
    user = create_test_user()
    
    # 2. Mock Gmail service to return sample emails
    emails = [sample_banco_chile_email()]
    
    # 3. Run sync
    stats = transaction_service.sync_transactions_for_user(user)
    
    # 4. Verify transaction created
    transactions = get_user_transactions(user)
    assert len(transactions) == 1
    assert transactions[0].amount == Decimal("45990")
```
