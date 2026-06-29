#!/bin/bash
# ══════════════════════════════════════════════════════════════
# HDA GO DASHBOARD — Deploy Script (Frontend Fix: QC Page)
# Jalankan di VPS server sebagai root atau user dengan sudo
# ══════════════════════════════════════════════════════════════

set -e

FRONTEND_DIR="/var/www/hda-go-frontend"  # Sesuaikan path VPS kamu
BACKEND_DIR="/var/www/hda-go-backend"    # Sesuaikan path VPS kamu
PM2_FRONTEND_NAME="hda-frontend"          # Nama PM2 process frontend
PM2_BACKEND_NAME="hda-backend"            # Nama PM2 process backend

echo "═══════════════════════════════════════════════════"
echo "🚀 HDA GO — QC Fix Deployment"
echo "═══════════════════════════════════════════════════"

# ── Step 1: Diagnose current state ──────────────────────
echo ""
echo "📋 [1/7] Cek status PM2 processes..."
pm2 list

echo ""
echo "📋 [1b] Cek port yang sedang listen..."
ss -tlnp | grep -E ':(3000|4000|4001|80|443)'

# ── Step 2: Pull latest code ──────────────────────────────
echo ""
echo "📥 [2/7] Pull kode terbaru dari git..."
cd "$FRONTEND_DIR"
git pull origin main --ff-only

# ── Step 3: Update .env.local untuk production ────────────
echo ""
echo "⚙️  [3/7] Update frontend .env.local untuk production..."
cat > "$FRONTEND_DIR/.env.local" <<'EOF'
NEXT_PUBLIC_API_URL=https://dashboardhdago.com/api
NEXT_PUBLIC_SOCKET_URL=https://dashboardhdago.com
EOF
echo "✅ .env.local updated"

# ── Step 4: Update backend CORS ───────────────────────────
echo ""
echo "⚙️  [4/7] Update backend CORS_ORIGIN..."
# Backup .env backend
cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"

# Update CORS_ORIGIN — tambah domain production
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://dashboardhdago.com,http://dashboardhdago.com|' "$BACKEND_DIR/.env"
echo "✅ Backend CORS updated"
grep CORS_ORIGIN "$BACKEND_DIR/.env"

# ── Step 5: Install dependencies & Build frontend ─────────
echo ""
echo "🏗️  [5/7] Build frontend Next.js..."
cd "$FRONTEND_DIR"
npm ci --production=false
npm run build
echo "✅ Frontend build selesai"

# ── Step 6: Restart services ──────────────────────────────
echo ""
echo "🔄 [6/7] Restart PM2 services..."

# Restart backend dulu (agar CORS update aktif)
pm2 restart "$PM2_BACKEND_NAME" --update-env || echo "⚠️  Backend tidak ditemukan di PM2, skip restart"

# Restart frontend
pm2 restart "$PM2_FRONTEND_NAME" --update-env || {
  echo "⚠️  Frontend PM2 process tidak ditemukan. Mencoba start..."
  cd "$FRONTEND_DIR"
  pm2 start npm --name "$PM2_FRONTEND_NAME" -- start
}

pm2 save
echo "✅ PM2 services restarted"

# ── Step 7: Health check ──────────────────────────────────
echo ""
echo "🧪 [7/7] Health check..."
sleep 5

# Test frontend
echo "Testing frontend (port 3000)..."
if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000/qc | grep -qE "^(200|301|302|307|308)"; then
  echo "✅ Frontend /qc: ACCESSIBLE"
else
  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/qc)
  echo "❌ Frontend /qc: HTTP $FRONTEND_STATUS"
  echo "   → Cek log: pm2 logs $PM2_FRONTEND_NAME --lines 30"
fi

# Test backend API
echo ""
echo "Testing backend API..."
if curl -f -s -o /dev/null http://localhost:4001/api/health 2>/dev/null || \
   curl -f -s -o /dev/null http://localhost:4000/api/health 2>/dev/null; then
  echo "✅ Backend API: RUNNING"
else
  echo "⚠️  Backend health endpoint tidak ditemukan (normal jika tidak ada /health endpoint)"
  BACKEND_PORT=$(grep "^PORT=" "$BACKEND_DIR/.env" | cut -d= -f2)
  echo "   Backend should be running on port: $BACKEND_PORT"
fi

# Test via Nginx (public URL)
echo ""
echo "Testing via Nginx (public)..."
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://dashboardhdago.com/qc 2>/dev/null || echo "FAILED")
echo "   dashboardhdago.com/qc → HTTP $PUBLIC_STATUS"

if [ "$PUBLIC_STATUS" = "200" ] || [ "$PUBLIC_STATUS" = "307" ] || [ "$PUBLIC_STATUS" = "302" ]; then
  echo "✅ Halaman /qc DAPAT DIAKSES via internet!"
elif [ "$PUBLIC_STATUS" = "FAILED" ]; then
  echo "❌ Tidak bisa reach domain. Cek Nginx:"
  nginx -t && echo "Nginx config OK" || echo "Nginx config ERROR"
  echo ""
  echo "Cek Nginx sites-enabled:"
  ls /etc/nginx/sites-enabled/
else
  echo "❌ Unexpected status: $PUBLIC_STATUS. Cek log:"
  pm2 logs "$PM2_FRONTEND_NAME" --lines 20
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "📊 Status PM2 Final:"
pm2 list
echo "═══════════════════════════════════════════════════"
echo "Deployment selesai! Waktu: $(date)"
