# 🚀 START HERE - Chauchero

Welcome to your Chilean bank spending tracker! This file will get you up and running in minutes.

## What You Have

A **complete, production-ready** spending tracker that:
- ✅ Extracts transactions from Gmail bank notifications
- ✅ Supports Banco de Chile (ready to add more)
- ✅ Beautiful, responsive UI
- ✅ Secure Google OAuth
- ✅ Free to run (no API costs)
- ✅ Easy to extend with new banks

## Quick Start (3 Steps)

### Step 1: Install Docker

**macOS:**
```bash
brew install --cask docker
```

**Or download**: https://www.docker.com/products/docker-desktop

### Step 2: Configure Google OAuth (5 minutes)

1. Go to https://console.cloud.google.com/
2. Create new project: "Chauchero"
3. Enable **Gmail API**:
   - "APIs & Services" > "Library" > Search "Gmail API" > Enable
4. Configure **OAuth consent**:
   - "APIs & Services" > "OAuth consent screen"
   - User type: External
   - App name: Chauchero
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `openid`
5. Create **credentials**:
   - "APIs & Services" > "Credentials" > "Create Credentials"
   - OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
   - Copy the **Client ID** and **Client Secret**

6. Edit `backend/.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

### Step 3: Run Setup Script

```bash
cd /Users/diego/Documents/Chauchero
./setup.sh
```

This will:
- Start PostgreSQL
- Install all dependencies
- Run database migrations
- Generate secure keys

### Step 4: Start the App

**Option A - Automated:**
```bash
./dev.sh
```

**Option B - Manual (2 terminals):**

Terminal 1:
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload
```

Terminal 2:
```bash
cd frontend
npm run dev
```

### Step 5: Use It!

1. Open http://localhost:3000
2. Click "Continue with Google"
3. Authorize Gmail access
4. Click "Sync Now" in dashboard
5. See your Banco de Chile transactions!

## 📁 Project Structure

```
Chauchero/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── parsers/     # ⭐ Bank parsers (add new banks here)
│   │   ├── services/    # Business logic
│   │   ├── routers/     # API endpoints
│   │   └── models/      # Database models
│   ├── tests/           # Unit tests
│   └── scripts/         # Utility scripts
├── frontend/            # Next.js frontend
│   ├── app/             # Pages (routing)
│   ├── components/      # React components
│   └── lib/             # Utilities
└── docs/                # You're here!
```

## 🏦 Adding More Banks (Easy!)

Want to add Santander, BCI, or another bank?

1. **Get sample emails** from that bank
2. **Copy the parser template**:
   ```bash
   cp backend/app/parsers/banco_chile.py backend/app/parsers/santander.py
   ```
3. **Update patterns** in the new file:
   - Change `bank_name = "Santander"`
   - Change `email_domains = ["santander.cl", ...]`
   - Adjust regex patterns for amount, date, description
4. **Register it**:
   ```python
   # backend/app/parsers/__init__.py
   from .santander import SantanderParser
   ```
5. **Test it**:
   ```bash
   cd backend
   ./venv/bin/python scripts/test_parser.py
   ```
6. **Restart backend** - Done!

See `CONTRIBUTING.md` for detailed guide.

## 📚 Documentation

- `QUICKSTART.md` - Detailed setup instructions
- `ARCHITECTURE.md` - How the system works
- `CONTRIBUTING.md` - How to add new banks
- `BANCO_EMAIL_FORMATS.md` - Email format reference for Chilean banks
- `DEPLOYMENT.md` - Deploy to production
- `PROJECT_STATUS.md` - What's implemented

## 🧪 Testing

**Test the parser:**
```bash
cd backend
./venv/bin/python scripts/test_parser.py
```

**Run unit tests:**
```bash
cd backend
./venv/bin/pytest
```

**Test API endpoints:**
Open http://localhost:8000/docs (Swagger UI)

## 🆘 Troubleshooting

**Backend won't start:**
- Check if port 8000 is in use: `lsof -ti:8000`
- Check database is running: `docker compose ps`
- Check `.env` file has all required values

**Frontend won't start:**
- Check if port 3000 is in use: `lsof -ti:3000`
- Run `npm install` again

**OAuth error:**
- Verify redirect URI is exact: `http://localhost:8000/auth/google/callback`
- Check Client ID and Secret in `.env`
- Make sure Gmail API is enabled

**No transactions found:**
- Make sure you have Banco de Chile emails in Gmail
- Check backend logs for parsing errors
- Try the test script to verify parser works

## 💡 Pro Tips

1. **Check parser output**: Look at confidence scores to see parsing quality
2. **Update manually**: You can edit transactions if parsing is wrong
3. **Test before real use**: Use `scripts/test_parser.py` with sample emails
4. **Monitor logs**: Backend logs show detailed parsing info
5. **Start simple**: Get one bank working well before adding others

## 🎯 What's Next?

**Immediate:**
- [ ] Complete Google OAuth setup
- [ ] Start Docker & run migrations
- [ ] Test with your real Gmail

**Soon:**
- [ ] Add your other banks (Santander, BCI, etc.)
- [ ] Customize categories
- [ ] Add spending analytics

**Future:**
- [ ] Auto-sync (background jobs)
- [ ] Mobile app
- [ ] Export reports
- [ ] Budget tracking

## 🤝 Need Help?

- Check `PROJECT_STATUS.md` for what's implemented
- Read `ARCHITECTURE.md` to understand the design
- See `BANCO_EMAIL_FORMATS.md` for email patterns
- Look at test files for usage examples

---

**Everything is ready to go - just configure OAuth and start the servers!** 🎉
