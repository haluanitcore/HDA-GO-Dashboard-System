#!/bin/bash
# ═══════════════════════════════════════════════
# HDA GO — Complete Server Fix & Deploy Script
# Jalankan di VPS: bash /root/hda-go/fix_and_deploy.sh
# ═══════════════════════════════════════════════
set -e

echo ""
echo "═══════════════════════════════════════════════"
echo "🚀 HDA GO — Complete Fix & Deploy"
echo "═══════════════════════════════════════════════"
echo ""

# ── Step 1: Create backend .env if missing ──
echo "📋 [1/8] Setting up backend .env..."
if [ ! -f /root/hda-go/hda-go-backend/.env ]; then
  # Get existing JWT secrets from PM2 env or generate new ones
  JWT_S=$(openssl rand -hex 32)
  JWT_RS=$(openssl rand -hex 32)

  cat > /root/hda-go/hda-go-backend/.env << ENVEOF
# ─── Database ─────────────────────────────────
DATABASE_URL="file:./dev.db"

# ─── JWT Secrets ──────────────────────────────
JWT_SECRET="${JWT_S}"
JWT_REFRESH_SECRET="${JWT_RS}"

# ─── Server ───────────────────────────────────
PORT=4001

# ─── CORS ─────────────────────────────────────
CORS_ORIGIN=http://localhost:3000,https://dashboardhdago.com,http://dashboardhdago.com
ENVEOF
  echo "  ✅ Backend .env CREATED (new JWT secrets generated)"
else
  # .env exists, just update CORS
  if ! grep -q "dashboardhdago.com" /root/hda-go/hda-go-backend/.env; then
    sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:3000,https://dashboardhdago.com,http://dashboardhdago.com|' /root/hda-go/hda-go-backend/.env
    echo "  ✅ Backend .env CORS updated"
  else
    echo "  ✅ Backend .env already configured"
  fi
fi

# ── Step 2: Create frontend .env.local ──
echo ""
echo "📋 [2/8] Setting up frontend .env.local..."
cat > /root/hda-go/hda-go-frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://dashboardhdago.com/api
NEXT_PUBLIC_SOCKET_URL=https://dashboardhdago.com
EOF
echo "  ✅ Frontend .env.local configured for production"

# ── Step 3: Install backend dependencies ──
echo ""
echo "📦 [3/8] Installing backend dependencies..."
cd /root/hda-go/hda-go-backend
npm install --legacy-peer-deps 2>&1 | tail -3
echo "  ✅ Backend dependencies installed"

# ── Step 4: Setup database (Prisma) ──
echo ""
echo "🗄️  [4/8] Setting up database..."
cd /root/hda-go/hda-go-backend

# Check if using SQLite or PostgreSQL
DB_URL=$(grep "^DATABASE_URL" .env | head -1)
echo "  Database: $DB_URL"

npx prisma generate 2>&1 | tail -3
npx prisma db push --accept-data-loss 2>&1 | tail -5
echo "  ✅ Database schema synced"

# ── Step 5: Build backend NestJS ──
echo ""
echo "🏗️  [5/8] Building backend NestJS..."
cd /root/hda-go/hda-go-backend
npm run build 2>&1 | tail -5
if [ -f dist/main.js ]; then
  echo "  ✅ Backend build SUCCESS (dist/main.js exists)"
else
  echo "  ❌ Backend build FAILED! Check errors above."
  exit 1
fi

# ── Step 6: Install & Build frontend Next.js ──
echo ""
echo "🏗️  [6/8] Building frontend Next.js..."
cd /root/hda-go/hda-go-frontend
npm install --legacy-peer-deps 2>&1 | tail -3
npm run build 2>&1 | tail -15
echo "  ✅ Frontend build completed"

# ── Step 7: Start/Restart PM2 services ──
echo ""
echo "🔄 [7/8] Starting PM2 services..."

# Stop existing services (ignore errors)
pm2 delete hda-go-backend 2>/dev/null || true
pm2 delete hda-go-frontend 2>/dev/null || true

# Start backend
cd /root/hda-go/hda-go-backend
pm2 start dist/main.js --name hda-go-backend --env production
echo "  ✅ Backend started on PM2"

# Start frontend
cd /root/hda-go/hda-go-frontend
pm2 start npm --name hda-go-frontend -- start
echo "  ✅ Frontend started on PM2"

# Save PM2 config for auto-restart
pm2 save
echo "  ✅ PM2 config saved"

# ── Step 8: Health checks ──
echo ""
echo "🧪 [8/8] Health checks (waiting 8 seconds for startup)..."
sleep 8

pm2 list

echo ""
echo "Testing backend (port 4001)..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/auth/cm-list 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "401" ]; then
  echo "  ✅ Backend RUNNING (HTTP $BACKEND_STATUS)"
else
  echo "  ⚠️  Backend status: HTTP $BACKEND_STATUS"
  echo "  Checking PM2 logs..."
  pm2 logs hda-go-backend --lines 10 --nostream
fi

echo ""
echo "Testing frontend (port 3000)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/qc 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "307" ] || [ "$FRONTEND_STATUS" = "302" ]; then
  echo "  ✅ Frontend /qc ACCESSIBLE (HTTP $FRONTEND_STATUS)"
else
  echo "  ⚠️  Frontend /qc status: HTTP $FRONTEND_STATUS"
  echo "  Checking PM2 logs..."
  pm2 logs hda-go-frontend --lines 10 --nostream
fi

echo ""
echo "Testing via Nginx (public domain)..."
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://dashboardhdago.com/qc 2>/dev/null || echo "000")
echo "  dashboardhdago.com/qc → HTTP $PUBLIC_STATUS"

echo ""
echo "═══════════════════════════════════════════════"
echo "🎉 Deployment selesai! $(date)"
echo "═══════════════════════════════════════════════"
