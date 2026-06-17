#!/bin/bash
# ==============================================================================
# HDA GO — PRODUCTION DIAGNOSTIC (READ-ONLY, no changes made)
# Jalankan: sudo bash diagnose_server.sh
# ==============================================================================

DOMAIN="dashboardhdago.com"
APP_DIR="/var/www/hda-go"

echo "================================================================"
echo "  🔍 HDA GO PRODUCTION DIAGNOSTICS"
echo "================================================================"

echo ""
echo "--- [1] PM2 STATUS ---"
sudo -u hdago pm2 status 2>/dev/null || pm2 status 2>/dev/null

echo ""
echo "--- [2] PORT CHECK ---"
echo "Port 3000 (frontend):"
ss -tlnp | grep ':3000' || echo "  NOT LISTENING"
echo "Port 4000 (backend):"
ss -tlnp | grep ':4000' || echo "  NOT LISTENING"
echo "Port 80 (nginx http):"
ss -tlnp | grep ':80' || echo "  NOT LISTENING"
echo "Port 443 (nginx https):"
ss -tlnp | grep ':443' || echo "  NOT LISTENING"

echo ""
echo "--- [3] NGINX STATUS ---"
systemctl is-active nginx && echo "Nginx: RUNNING" || echo "Nginx: NOT RUNNING"
nginx -t 2>&1 | tail -3

echo ""
echo "--- [4] SSL CERTIFICATE ---"
CERT="/etc/letsencrypt/live/$DOMAIN/cert.pem"
if [ -f "$CERT" ]; then
  openssl x509 -enddate -subject -noout -in "$CERT"
else
  echo "SSL cert NOT found at $CERT"
fi

echo ""
echo "--- [5] BACKEND .env CHECK ---"
ENV_FILE="$APP_DIR/hda-go-backend/.env"
if [ -f "$ENV_FILE" ]; then
  echo "File exists. Variables:"
  grep -E "^(NODE_ENV|PORT|CORS_ORIGIN|DATABASE_URL)" "$ENV_FILE" | sed 's/=.*/=***HIDDEN***/' || true
  grep "^NODE_ENV" "$ENV_FILE" || echo "  !! NODE_ENV missing"
else
  echo "  !! .env NOT FOUND at $ENV_FILE"
fi

echo ""
echo "--- [6] FRONTEND .env CHECK ---"
FE_ENV="$APP_DIR/hda-go-frontend/.env.local"
if [ -f "$FE_ENV" ]; then
  cat "$FE_ENV"
else
  echo "  !! .env.local NOT FOUND at $FE_ENV"
fi

echo ""
echo "--- [7] LOCAL CURL TEST ---"
echo -n "Backend port 4000: "
curl -sf --max-time 3 http://localhost:4000/api > /dev/null 2>&1 && echo "OK" || echo "FAIL"
echo -n "Frontend port 3000: "
curl -sf --max-time 3 http://localhost:3000 > /dev/null 2>&1 && echo "OK" || echo "FAIL"

echo ""
echo "--- [8] NGINX CONFIG ---"
cat /etc/nginx/sites-enabled/hda-go 2>/dev/null | head -20 || echo "Nginx config not found"

echo ""
echo "--- [9] RECENT BACKEND LOGS ---"
sudo -u hdago pm2 logs hda-go-backend --lines 20 --nostream 2>/dev/null

echo ""
echo "================================================================"
echo "  Kirim output di atas ke tim support untuk diagnosa lebih lanjut"
echo "================================================================"
