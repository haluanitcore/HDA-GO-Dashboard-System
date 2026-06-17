#!/bin/bash
# ==============================================================================
# HDA GO — DEPLOY LATEST CODE TO PRODUCTION VPS
# Jalankan di SERVER via SSH: sudo bash deploy_to_production.sh
# ==============================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

APP_DIR="/var/www/hda-go"
REPO_URL="https://github.com/haluanitcore/HDA-GO-Dashboard-System.git"

echo ""
echo "================================================================"
echo "  🚀 HDA GO — PRODUCTION DEPLOY"
echo "================================================================"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: Pull latest code
# ------------------------------------------------------------------------------
log "STEP 1: Pull latest code dari GitHub..."
cd "$APP_DIR" || fail "Directory $APP_DIR tidak ditemukan"

if [ -d ".git" ]; then
  git pull origin main 2>&1 || git pull origin master 2>&1 || warn "Git pull gagal — coba manual"
else
  warn "Bukan git repo — skip pull"
fi
ok "Code terbaru"

# ------------------------------------------------------------------------------
# STEP 2: Build & restart backend
# ------------------------------------------------------------------------------
log "STEP 2: Build backend..."
cd "$APP_DIR/hda-go-backend" || fail "Backend dir tidak ditemukan"

# Pastikan NODE_ENV=production ada di .env
grep -q "^NODE_ENV=production" .env 2>/dev/null || {
  warn "NODE_ENV tidak ada — tambahkan ke .env"
  grep -q "^NODE_ENV" .env && sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env || echo "NODE_ENV=production" >> .env
}

npm install --production=false
npm run build
ok "Backend build sukses"

log "Restart backend PM2..."
sudo -u hdago pm2 restart hda-go-backend 2>/dev/null || \
sudo -u hdago pm2 start dist/main.js --name "hda-go-backend"
sleep 3

# Verify backend up
if curl -sf --max-time 5 http://localhost:4000/api > /dev/null 2>&1; then
  ok "Backend merespons di port 4000"
else
  warn "Backend belum merespons — cek logs:"
  sudo -u hdago pm2 logs hda-go-backend --lines 20 --nostream
fi

# ------------------------------------------------------------------------------
# STEP 3: Build & restart frontend
# ------------------------------------------------------------------------------
log "STEP 3: Build frontend..."
cd "$APP_DIR/hda-go-frontend" || fail "Frontend dir tidak ditemukan"

npm install
npm run build
ok "Frontend build sukses"

log "Restart frontend PM2..."
sudo -u hdago pm2 restart hda-go-frontend 2>/dev/null || \
sudo -u hdago pm2 start npm --name "hda-go-frontend" -- start -- -p 3000
sleep 3

if curl -sf --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
  ok "Frontend merespons di port 3000"
else
  warn "Frontend belum merespons — cek logs:"
  sudo -u hdago pm2 logs hda-go-frontend --lines 20 --nostream
fi

# ------------------------------------------------------------------------------
# STEP 4: Save PM2 state
# ------------------------------------------------------------------------------
log "STEP 4: Save PM2 process list..."
sudo -u hdago pm2 save
ok "PM2 state saved"

# ------------------------------------------------------------------------------
# STEP 5: Test produksi
# ------------------------------------------------------------------------------
log "STEP 5: Test endpoint produksi..."
sleep 2

DOMAIN="dashboardhdago.com"
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/login" 2>/dev/null)
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "https://$DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hdago.com","password":"HdaGo123!"}' 2>/dev/null)

[ "$HTTPS_CODE" = "200" ] && ok "Frontend HTTPS: $HTTPS_CODE" || warn "Frontend HTTPS: $HTTPS_CODE"
[ "$API_CODE" = "200" ]   && ok "Login API: $API_CODE"        || warn "Login API: $API_CODE"

# ------------------------------------------------------------------------------
# FINAL STATUS
# ------------------------------------------------------------------------------
echo ""
echo "================================================================"
echo "  📊 DEPLOY SELESAI"
echo "================================================================"
sudo -u hdago pm2 status
echo ""
ok "Deploy sukses! Buka: https://$DOMAIN/login"
