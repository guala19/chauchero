# Chauchero - Features & Roadmap

## Current Features (v0.1.0)

### Core Functionality
- ✅ **Gmail OAuth Integration**: Secure read-only access to user's Gmail
- ✅ **Email Parsing**: Automatic extraction of transaction data from bank emails
- ✅ **Multi-Bank Support**: Extensible architecture (currently: Banco de Chile)
- ✅ **Transaction Management**: View, filter, and update transactions
- ✅ **Manual Sync**: On-demand transaction synchronization
- ✅ **Confidence Scoring**: Transparency about parsing quality

### User Experience
- ✅ **Beautiful UI**: Modern, responsive design with Tailwind CSS
- ✅ **Transaction Dashboard**: Clean table view with formatting
- ✅ **Real-time Updates**: See new transactions immediately after sync
- ✅ **Transaction Details**: Amount, date, merchant, type, confidence
- ✅ **Visual Indicators**: Color-coded transaction types and confidence

### Developer Experience
- ✅ **Easy Bank Addition**: Add new banks in ~1 hour with template
- ✅ **Parser Testing**: Built-in test scripts and unit tests
- ✅ **API Documentation**: Auto-generated Swagger/OpenAPI docs
- ✅ **Type Safety**: TypeScript frontend, Pydantic backend
- ✅ **Local Development**: Docker Compose for easy setup

### Technical Features
- ✅ **Deduplication**: Email IDs prevent duplicate transactions
- ✅ **Pagination**: Efficient loading of large transaction lists
- ✅ **Error Handling**: Graceful failures and retry logic
- ✅ **Rate Limit Handling**: Respects Gmail API quotas
- ✅ **Database Migrations**: Alembic for schema versioning

## Planned Features

### Phase 1: Enhanced Parsing (1-2 weeks)

- [ ] **5+ More Banks**:
  - Santander
  - BCI
  - Itaú
  - Scotiabank
  - Banco Estado
  - Banco Falabella
  - Banco Ripley

- [ ] **Improved Parsing**:
  - Handle HTML emails better
  - Support international transactions
  - Multi-currency support
  - Account type detection (credit card, debit, checking)

- [ ] **Parser Analytics**:
  - Dashboard showing parser success rates
  - Failed email review UI
  - Community-submitted patterns

### Phase 2: Smart Features (2-3 weeks)

- [ ] **Auto-Categorization**:
  - Rule-based categories (e.g., "UBER" → Transport)
  - Machine learning categorization
  - Custom category creation
  - Category suggestions

- [ ] **Transaction Search**:
  - Full-text search
  - Filter by date range, bank, category
  - Sort options
  - Saved searches

- [ ] **Bulk Operations**:
  - Multi-select transactions
  - Bulk categorization
  - Bulk validation
  - Batch export

- [ ] **Manual Transactions**:
  - Add cash transactions
  - Edit any field
  - Split transactions
  - Recurring transaction templates

### Phase 3: Analytics & Insights (2-3 weeks)

- [ ] **Spending Analytics**:
  - Monthly spending trends
  - Category breakdown (pie chart)
  - Bank-by-bank comparison
  - Top merchants

- [ ] **Visualizations**:
  - Line charts (spending over time)
  - Bar charts (by category)
  - Heat maps (spending patterns)
  - Export charts as images

- [ ] **Reports**:
  - Monthly/weekly summaries
  - Custom date ranges
  - Export to PDF
  - Email reports (optional)

- [ ] **Budgets**:
  - Set category budgets
  - Budget alerts
  - Progress tracking
  - Rollover unused budget

### Phase 4: Automation (1-2 weeks)

- [ ] **Auto-Sync**:
  - Scheduled daily/hourly sync
  - Celery + Redis background jobs
  - Configurable sync frequency per user
  - Sync status notifications

- [ ] **Smart Notifications**:
  - New transaction alerts
  - Large transaction warnings
  - Budget exceeded notifications
  - Weekly summaries

- [ ] **Recurring Transactions**:
  - Auto-detect subscriptions
  - Flag unusual charges
  - Predict upcoming recurring charges

### Phase 5: Advanced Features

- [ ] **Multi-User Support**:
  - Share accounts with family
  - Different permission levels
  - Shared budgets

- [ ] **Bank Account Linking**:
  - Support multiple Gmail accounts per user
  - Link transactions across accounts
  - Account balance tracking (if available in emails)

- [ ] **LLM Integration**:
  - Fallback parser for unknown banks
  - Natural language queries ("How much did I spend on food this month?")
  - Smart categorization suggestions
  - Transaction insights

- [ ] **Open Banking Integration**:
  - When Chile's Open Banking launches (July 2026)
  - Direct API integration as alternative to email parsing
  - Real-time balance updates

- [ ] **Mobile App**:
  - React Native or Flutter
  - Push notifications
  - OCR for receipt scanning
  - Offline mode

### Phase 6: Ecosystem

- [ ] **Public API**:
  - REST API for third-party integrations
  - Webhooks for new transactions
  - API rate limiting
  - API keys management

- [ ] **Integrations**:
  - Export to Google Sheets
  - Sync with accounting software
  - YNAB integration
  - Notion integration

- [ ] **Community**:
  - User-submitted bank parsers
  - Public parser marketplace
  - Rating system for parsers
  - Crowdsourced email format database

## Non-Goals (Out of Scope)

❌ **Investment Tracking**: Focus is spending/transactions, not portfolio management
❌ **Bill Payment**: Read-only, no transaction initiation
❌ **Cryptocurrency**: Traditional banking only
❌ **Credit Score**: Not a credit monitoring service
❌ **Loan Management**: Transaction tracking only

## Feature Prioritization

**High Priority** (Core value):
- More bank parsers
- Auto-sync
- Categorization
- Basic analytics

**Medium Priority** (Enhanced UX):
- Advanced filtering
- Visualizations
- Budgets
- Reports

**Low Priority** (Nice to have):
- Mobile app
- Third-party integrations
- Advanced ML features

## Community Contributions

We welcome contributions for:
- New bank parsers (highest priority!)
- Bug fixes
- UI improvements
- Documentation
- Translations (English/Spanish)

See `CONTRIBUTING.md` for guidelines.

## Version History

### v0.1.0 (Current) - MVP
- Gmail OAuth authentication
- Banco de Chile parser
- Basic dashboard
- Manual sync
- Transaction list

### v0.2.0 (Next) - Multi-Bank
- 5+ bank parsers
- Improved UI
- Transaction filters
- Auto-categorization basics

### v0.3.0 (Future) - Analytics
- Charts and visualizations
- Monthly reports
- Budget tracking
- Auto-sync

### v1.0.0 (Future) - Production Ready
- 10+ banks supported
- Mobile-responsive
- Performance optimized
- Comprehensive testing
- Production deployment guide
