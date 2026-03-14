# Chauchero Setup Guide

Quick start guide to get Chauchero running locally.

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Docker and Docker Compose
- Google Cloud account (for OAuth)

## Step-by-Step Setup

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Chauchero")
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in app name: "Chauchero"
   - Add your email
   - Add scope: `https://www.googleapis.com/auth/gmail.readonly`
5. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Chauchero Web"
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
   - Save the Client ID and Client Secret

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Edit .env with your values:
# - GOOGLE_CLIENT_ID (from step 1)
# - GOOGLE_CLIENT_SECRET (from step 1)
# - SECRET_KEY (generate with: openssl rand -hex 32)
```

### 3. Database Setup

```bash
# From project root
docker-compose up -d

# Wait for PostgreSQL to be ready
docker-compose ps

# Run migrations (from backend directory)
cd backend
alembic upgrade head
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local

# No changes needed if using default ports
```

### 5. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Access the Application

Open http://localhost:3000 in your browser

- Click "Continue with Google"
- Authorize Gmail access
- Click "Sync Now" to fetch transactions from your bank emails

## Testing the Parser

To test the Banco de Chile parser with your own emails:

1. Make sure you have bank notification emails in your Gmail
2. Log in to the app
3. Click "Sync Now"
4. Check the sync stats and transaction list

## Troubleshooting

**Database connection errors:**
```bash
docker-compose ps  # Check if Postgres is running
docker-compose logs postgres  # Check logs
```

**OAuth errors:**
- Verify redirect URI matches exactly in Google Console
- Check that CLIENT_ID and CLIENT_SECRET are correct
- Try re-creating OAuth credentials

**No transactions found:**
- Check that you have bank emails in Gmail
- Verify email domains match in `banco_chile.py`
- Check backend logs for parsing errors

## Next Steps

- Add more bank parsers (see backend/README.md)
- Configure auto-sync with Celery (optional)
- Deploy to production (see deployment guides)
