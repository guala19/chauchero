# Contributing to Chauchero

Thank you for helping expand Chauchero's bank coverage!

## Adding a New Bank Parser

### What You Need

1. Access to email notifications from the bank
2. At least 3-5 sample emails of different transaction types:
   - Purchase/Debit
   - Transfer
   - Credit/Deposit
   - International (if applicable)

### Process

1. **Collect Email Samples**
   - Save 5+ real email examples
   - Note the sender addresses
   - Document the patterns you see

2. **Create Parser File**
   - Copy `backend/app/parsers/banco_chile.py` as template
   - Rename to your bank (e.g., `santander.py`)
   - Update `bank_name`, `email_domains`, `subject_keywords`

3. **Write Regex Patterns**
   - Update `_extract_amount()` with bank's amount format
   - Update `_extract_date()` with bank's date format
   - Update `_extract_description()` with merchant/description patterns
   - Update `_extract_card_digits()` with account number patterns

4. **Test Thoroughly**
   - Add test cases in `tests/test_[bank]_parser.py`
   - Run: `pytest tests/test_[bank]_parser.py`
   - Test with real emails if possible

5. **Register Parser**
   - Add import to `backend/app/parsers/__init__.py`
   - Add domain to `gmail_service.py` bank_domains list

6. **Document**
   - Add bank to README supported banks list
   - Add sample emails to `scripts/sample_emails.py`

### Parser Quality Checklist

- [ ] Handles at least 3 transaction types
- [ ] Extracts amount correctly (handles $, ., , formatting)
- [ ] Extracts date correctly (handles multiple formats)
- [ ] Extracts meaningful description
- [ ] Confidence score is accurate
- [ ] Has unit tests
- [ ] Tested with 5+ real emails
- [ ] Documentation updated

### Tips for Good Parsers

1. **Multiple Regex Patterns**: Banks sometimes vary their format
   ```python
   patterns = [
       r'Monto[:\s]+\$\s*([\d.,]+)',
       r'Total[:\s]+\$\s*([\d.,]+)',
       r'Por\s+\$\s*([\d.,]+)',
   ]
   ```

2. **Flexible Matching**: Use case-insensitive matching
   ```python
   re.search(pattern, content, re.IGNORECASE)
   ```

3. **Graceful Degradation**: If date extraction fails, use email date
   ```python
   transaction_date = self._extract_date(content) or email.date
   ```

4. **Conservative Confidence**: Better to flag as uncertain than create bad data
   ```python
   if not amount:
       return None  # Don't create transaction if critical data missing
   ```

## Code Style

- Follow PEP 8 for Python code
- Use type hints
- Add docstrings to methods
- Keep methods focused and small

## Testing

Run all tests:
```bash
cd backend
./venv/bin/pytest
```

Run specific parser test:
```bash
./venv/bin/pytest tests/test_banco_chile_parser.py -v
```

Manual testing:
```bash
./venv/bin/python scripts/test_parser.py
```

## Submitting Your Parser

If you want to share your parser with the community:

1. Fork the repository
2. Create a branch: `git checkout -b add-parser-[bank-name]`
3. Add your parser + tests
4. Commit: `git commit -m "Add parser for [Bank Name]"`
5. Push and create a Pull Request

Include in PR description:
- Bank name
- Email domains used
- Sample email format (sanitized, no personal data)
- Test results

## Bank-Specific Notes

### Banco de Chile
- Uses multiple sender domains
- Date format: DD/MM/YYYY
- Amount format: $X.XXX (dot as thousands separator)

### Common Chilean Bank Patterns

Most Chilean banks follow these conventions:
- Currency: CLP (Chilean Peso)
- Date format: DD/MM/YYYY or DD-MM-YYYY
- Amount: $X.XXX or $X.XXX.XXX (dot separator)
- Subject keywords: "transacción", "compra", "cargo", "abono"

## Questions?

Check existing parsers in `backend/app/parsers/` for examples, or review `ARCHITECTURE.md` for system design details.
