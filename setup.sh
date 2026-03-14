#!/bin/bash

set -e

echo "🚀 Chauchero Setup Script"
echo "=========================="
echo ""

PROJECT_ROOT="/Users/diego/Documents/Chauchero"

cd "$PROJECT_ROOT"

echo "📦 Step 1: Checking Docker..."
if command -v docker &> /dev/null; then
    echo "✓ Docker found"
    echo "  Starting PostgreSQL..."
    docker compose up -d
    echo "  Waiting for database to be ready..."
    sleep 5
else
    echo "⚠️  Docker not found. Please install Docker or use local PostgreSQL."
    echo "   macOS: brew install --cask docker"
    echo ""
    echo "   Or install PostgreSQL locally:"
    echo "   brew install postgresql@15"
    echo "   brew services start postgresql@15"
    echo "   createdb chauchero_db"
    echo ""
    read -p "Press Enter when database is ready, or Ctrl+C to exit..."
fi

echo ""
echo "🐍 Step 2: Setting up Backend..."
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

echo "  Installing dependencies..."
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
    echo "  Creating .env file..."
    cp .env.example .env
    
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i.bak "s/your-secret-key-here-generate-with-openssl-rand-hex-32/$SECRET_KEY/" .env
    rm .env.bak 2>/dev/null || true
    
    echo "  ✓ .env created with generated SECRET_KEY"
fi

echo "  Running database migrations..."
if ./venv/bin/alembic upgrade head 2>/dev/null; then
    echo "  ✓ Migrations completed"
else
    echo "  ⚠️  Migrations failed. Make sure PostgreSQL is running."
    echo "     You can run migrations manually later:"
    echo "     cd backend && ./venv/bin/alembic upgrade head"
fi

echo ""
echo "⚛️  Step 3: Setting up Frontend..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install
fi

if [ ! -f ".env.local" ]; then
    echo "  Creating .env.local..."
    cp .env.local.example .env.local
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Configure Google OAuth"
echo ""
echo "1. Go to: https://console.cloud.google.com/"
echo "2. Create a project: 'Chauchero'"
echo "3. Enable Gmail API"
echo "4. Create OAuth 2.0 credentials"
echo "5. Add redirect URI: http://localhost:8000/auth/google/callback"
echo "6. Update backend/.env with your:"
echo "   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com"
echo "   GOOGLE_CLIENT_SECRET=your-secret"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 To start the application:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd $PROJECT_ROOT/backend"
echo "  ./venv/bin/uvicorn app.main:app --reload"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd $PROJECT_ROOT/frontend"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
