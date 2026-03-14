# Chauchero Architecture

## Overview

Chauchero uses a modular parser architecture that makes it easy to add new banks without modifying core logic.

## System Flow

```
User Gmail → OAuth Authorization → Backend API → Gmail Service → Parser Registry → Bank Parser → Transaction Service → Database
```

## Core Components

### 1. Parser System

**Design Pattern: Strategy + Registry**

Each bank has its own parser class that inherits from `BankParser`:

```
BankParser (Abstract)
├── banco_chile.py (BancoChileParser)
├── santander.py (SantanderParser) ← Future
└── bci.py (BCIParser) ← Future
```

**Key Features:**
- Auto-registration: Parsers register themselves on import
- Pattern matching: Each parser defines email domains and keywords
- Confidence scoring: Each parse returns a confidence level (0-100%)
- Flexible extraction: Regex patterns with fallback options

### 2. Parser Registry

Central registry (`parser_registry`) that:
- Stores all available parsers
- Matches emails to appropriate parser
- Provides API to query supported banks

### 3. Gmail Service

Handles all Gmail API interactions:
- OAuth token management
- Email fetching with smart queries
- Email marking (processed labels)
- Rate limit handling

### 4. Transaction Service

Business logic layer:
- Orchestrates sync process
- Creates/updates transactions
- Manages bank accounts
- Handles deduplication

## Adding New Banks - Step by Step

### Step 1: Analyze Email Format

Get sample emails from the bank and identify patterns:

```
Subject: Compra con tu Tarjeta
From: alertas@nuevobanco.cl

Hola,

Realizaste una compra:
Valor: $30.000
Fecha y hora: 09/03/2026 15:30
Local: FALABELLA SANTIAGO
Tarjeta: XXXX-XXXX-XXXX-4321
```

Identify:
- Email sender domain(s): `nuevobanco.cl`
- Subject keywords: `Compra`, `Tarjeta`
- Amount format: `Valor: $30.000`
- Date format: `09/03/2026 15:30`
- Description field: `Local: ...`
- Account identifier: `XXXX-XXXX-XXXX-4321`

### Step 2: Create Parser File

Create `backend/app/parsers/nuevo_banco.py`:

```python
from .base import BankParser, ParsedTransaction, EmailData, parser_registry
import re
from typing import Optional
from decimal import Decimal

class NuevoBancoParser(BankParser):
    bank_name = "Nuevo Banco"
    email_domains = ["nuevobanco.cl", "alertas.nuevobanco.cl"]
    subject_keywords = ["compra", "tarjeta", "transferencia"]
    
    def parse(self, email: EmailData) -> Optional[ParsedTransaction]:
        content = email.body or ""
        
        # Extract amount
        amount = self._extract_amount(content)
        if not amount:
            return None
        
        # Extract date
        transaction_date = self._extract_date(content) or email.date
        
        # Extract description
        description = self._extract_description(content) or email.subject
        
        # Determine type
        transaction_type = self._determine_type(content, amount)
        
        # Extract card digits
        last_4_digits = self._extract_card_digits(content)
        
        # Calculate confidence
        confidence = self._calculate_confidence(
            has_amount=bool(amount),
            has_date=bool(transaction_date != email.date),
            has_description=bool(description != email.subject)
        )
        
        return ParsedTransaction(
            amount=abs(amount),
            transaction_date=transaction_date,
            description=description,
            transaction_type=transaction_type,
            last_4_digits=last_4_digits,
            confidence=confidence,
            raw_data={
                "email_id": email.message_id,
                "subject": email.subject
            }
        )
    
    def _extract_amount(self, content: str) -> Optional[Decimal]:
        patterns = [
            r'Valor[:\s]+\$\s*([\d.,]+)',
            r'Monto[:\s]+\$\s*([\d.,]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                try:
                    return self.clean_amount(match.group(1))
                except:
                    continue
        return None
    
    def _extract_date(self, content: str) -> Optional[datetime]:
        pattern = r'Fecha y hora[:\s]+(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})'
        match = re.search(pattern, content)
        
        if match:
            try:
                date_str = f"{match.group(1)} {match.group(2)}"
                return datetime.strptime(date_str, "%d/%m/%Y %H:%M")
            except:
                pass
        return None
    
    def _extract_description(self, content: str) -> Optional[str]:
        pattern = r'Local[:\s]+(.+?)(?:\n|$)'
        match = re.search(pattern, content, re.IGNORECASE)
        
        if match:
            return match.group(1).strip()
        return None
    
    def _extract_card_digits(self, content: str) -> Optional[str]:
        pattern = r'XXXX-XXXX-XXXX-(\d{4})'
        match = re.search(pattern, content)
        
        if match:
            return match.group(1)
        return None
    
    def _determine_type(self, content: str, amount: Decimal) -> str:
        if "compra" in content.lower() or "cargo" in content.lower():
            return "debit"
        elif "abono" in content.lower() or "depósito" in content.lower():
            return "credit"
        return "debit"
    
    def _calculate_confidence(self, has_amount, has_date, has_description) -> int:
        score = 0
        if has_amount:
            score += 60
        if has_date:
            score += 20
        if has_description:
            score += 20
        return min(score, 100)

# Auto-register
parser_registry.register(NuevoBancoParser)
```

### Step 3: Register Parser

Add import to `backend/app/parsers/__init__.py`:

```python
from .nuevo_banco import NuevoBancoParser
```

### Step 4: Test Parser

```bash
# Run unit tests
cd backend
./venv/bin/pytest tests/test_nuevo_banco_parser.py

# Or test manually
./venv/bin/python scripts/test_parser.py
```

### Step 5: Update Gmail Query

Add the bank's domain to `GmailService._build_search_query()` in `backend/app/services/gmail_service.py`:

```python
bank_domains = [
    "bancochile.cl",
    "santander.cl",
    "nuevobanco.cl",  # ← Add here
    # ...
]
```

### Step 6: Done!

Restart the backend and the new bank will be automatically supported.

## Design Principles

### 1. Fail Gracefully
- Parsers return `None` if they can't parse
- Low confidence transactions are flagged
- Users can manually validate/edit

### 2. Confidence Scoring
- 90-100%: Fully confident (auto-validate)
- 70-89%: Moderately confident (show warning)
- 0-69%: Low confidence (require validation)

### 3. Extensibility
- New parsers don't modify existing code
- Parser rules can be stored in DB (future)
- LLM fallback can be added later

### 4. Deduplication
- Email ID is unique constraint
- Same email won't create duplicate transactions
- Gmail labels mark processed emails

## Data Flow Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Authorize Gmail
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 2. Request Sync
       ▼
┌─────────────┐
│  Backend    │
│   API       │
└──────┬──────┘
       │ 3. Fetch Emails
       ▼
┌─────────────┐
│   Gmail     │
│   Service   │
└──────┬──────┘
       │ 4. Return Emails
       ▼
┌─────────────┐
│   Parser    │
│  Registry   │
└──────┬──────┘
       │ 5. Find Parser
       ▼
┌─────────────┐
│    Bank     │
│   Parser    │
└──────┬──────┘
       │ 6. Extract Data
       ▼
┌─────────────┐
│Transaction  │
│  Service    │
└──────┬──────┘
       │ 7. Save Transaction
       ▼
┌─────────────┐
│  Database   │
└─────────────┘
```

## Performance Considerations

### Rate Limits
- Gmail API: 15,000 quota units/user/minute
- Reading 1 email = ~5 quota units
- ~3,000 emails/user/minute (more than enough)

### Optimization Strategies
- Batch email fetching (100 at a time)
- Use Gmail labels to avoid re-processing
- Store last_sync_at to fetch only new emails
- Async processing with Celery (optional, for auto-sync)

### Scaling
- Each user has independent Gmail quota
- No shared bottleneck
- Database indexes on email_id and transaction_date
- Pagination for transaction lists

## Security

### Token Storage
- Gmail refresh tokens are stored encrypted
- JWT for API authentication
- OAuth scopes limited to `gmail.readonly`

### Data Privacy
- Only transaction emails are processed
- Raw email content not stored (only extracted fields)
- Users can delete all data anytime
- No email sending capabilities

## Future Enhancements

1. **Parser Rules in DB**: Store regex patterns in `parser_rules` table for runtime updates
2. **LLM Fallback**: Use Claude/GPT for unknown email formats
3. **Auto-categorization**: ML model for spending categories
4. **Scheduled Sync**: Celery jobs for automatic daily sync
5. **Multi-currency**: Support for USD, EUR (not just CLP)
6. **Open Banking**: Integration when Chile's system launches (July 2026)
