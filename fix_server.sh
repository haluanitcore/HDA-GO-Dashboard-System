#!/bin/bash
# ==============================================================================
# HDA GO — PRODUCTION EMERGENCY FIX SCRIPT
# Jalankan di server: sudo bash fix_server.sh
# ==============================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
  fail "Jalankan sebagai root: sudo bash fix_server.sh"; exit 1
fi

DOMAIN="dashboardhdago.com"
APP_DIR="/var/www/hda-go"

echo ""
echo "================================================================"
echo "  🔧 HDA GO — PRODUCTION EMERGENCY FIX"
echo "================================================================"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: Cek PM2 processes
# ------------------------------------------------------------------------------
log "STEP 1: Cek PM2 status..."
sudo -u hdago pm2 status
echo ""

BACKEND_UP=$(sudo -u hdago pm2 list | grep "hda-go-backend" | grep "online" | wc -l)
FRONTEND_UP=$(sudo -u hdago pm2 list | grep "hda-go-frontend" | grep "online" | wc -l)

if [ "$BACKEND_UP" -eq 0 ]; then
  warn "Backend PM2 tidak online — restart..."
  cd "$APP_DIR/hda-go-backend"
  sudo -u hdago pm2 start dist/main.js --name "hda-go-backend" || sudo -u hdago pm2 restart hda-go-backend
fi

if [ "$FRONTEND_UP" -eq 0 ]; then
  warn "Frontend PM2 tidak online — restart..."
  sudo -u hdago pm2 restart hda-go-frontend || \
  sudo -u hdago pm2 start npm --name "hda-go-frontend" -- start -- -p 3000
fi

# ------------------------------------------------------------------------------
# STEP 2: Cek apakah backend dan frontend merespons di localhost
# ------------------------------------------------------------------------------
log "STEP 2: Cek port lokal..."

if curl -sf http://localhost:4000/api > /dev/null 2>&1; then
  ok "Backend merespons di port 4000"
else
  fail "Backend TIDAK merespons di port 4000 — cek log PM2:"
  sudo -u hdago pm2 logs hda-go-backend --lines 30 --nostream
fi

if curl -sf http://localhost:3000 > /dev/null 2>&1; then
  ok "Frontend merespons di port 3000"
else
  fail "Frontend TIDAK merespons di port 3000 — cek log PM2:"
  sudo -u hdago pm2 logs hda-go-frontend --lines 30 --nostream
fi

# ------------------------------------------------------------------------------
# STEP 3: Cek NODE_ENV di backend .env
# ------------------------------------------------------------------------------
log "STEP 3: Verifikasi backend .env..."
ENV_FILE="$APP_DIR/hda-go-backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  fail ".env tidak ditemukan di $ENV_FILE!"
  exit 1
fi

if ! grep -q "NODE_ENV" "$ENV_FILE"; then
  warn "NODE_ENV tidak ada di .env — tambahkan NODE_ENV=production"
  echo 'NODE_ENV=production' >> "$ENV_FILE"
  ok "NODE_ENV=production ditambahkan ke .env"
fi

if ! grep -q "^NODE_ENV=production" "$ENV_FILE"; then
  warn "NODE_ENV bukan production — fix..."
  sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE"
  ok "NODE_ENV diupdate ke production"
fi

# Pastikan NEXT_PUBLIC vars ada di frontend
FRONTEND_ENV="$APP_DIR/hda-go-frontend/.env.local"
if [ ! -f "$FRONTEND_ENV" ]; then
  warn ".env.local frontend tidak ada — buat ulang..."
  cat > "$FRONTEND_ENV" <<EOT
NEXT_PUBLIC_API_URL="https://$DOMAIN/api"
NEXT_PUBLIC_SOCKET_URL="https://$DOMAIN"
EOT
  ok ".env.local frontend dibuat"
fi

if ! grep -q "NEXT_PUBLIC_API_URL" "$FRONTEND_ENV"; then
  warn "NEXT_PUBLIC_API_URL tidak ada di frontend env!"
  echo "NEXT_PUBLIC_API_URL=\"https://$DOMAIN/api\"" >> "$FRONTEND_ENV"
  echo "NEXT_PUBLIC_SOCKET_URL=\"https://$DOMAIN\"" >> "$FRONTEND_ENV"
fi

cat "$FRONTEND_ENV"

# ------------------------------------------------------------------------------
# STEP 4: Cek dan fix Nginx
# ------------------------------------------------------------------------------
log "STEP 4: Cek Nginx..."

if ! systemctl is-active --quiet nginx; then
  fail "Nginx tidak berjalan! Coba start..."
  nginx -t
  systemctl start nginx
  if systemctl is-active --quiet nginx; then
    ok "Nginx berhasil distart"
  else
    fail "Nginx gagal start — cek config error:"
    nginx -t 2>&1
    exit 1
  fi
else
  ok "Nginx sedang running"
fi

# Test config syntax
if nginx -t 2>/dev/null; then
  ok "Nginx config syntax OK"
else
  fail "Nginx config ada syntax error:"
  nginx -t 2>&1
  log "Rollback ke default Nginx config..."
  rm -f /etc/nginx/sites-enabled/hda-go
  cat > /etc/nginx/sites-available/hda-go <<NGINXCONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'Upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF
  ln -sf /etc/nginx/sites-available/hda-go /etc/nginx/sites-enabled/hda-go
  nginx -t && systemctl restart nginx
  ok "Nginx config diperbaiki dan direstart"
fi

# ------------------------------------------------------------------------------
# STEP 5: Cek SSL Certificate
# ------------------------------------------------------------------------------
log "STEP 5: Cek SSL certificate..."

CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
if [ -d "$CERT_PATH" ]; then
  # Cek expiry
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH/cert.pem" 2>/dev/null | cut -d= -f2)
  ok "SSL cert ada. Expires: $EXPIRY"

  # Cek apakah Nginx config punya ssl block
  if ! grep -q "listen 443" /etc/nginx/sites-available/hda-go 2>/dev/null; then
    warn "Nginx config tidak ada HTTPS block — jalankan certbot ulang..."
    certbot --nginx --non-interactive --agree-tos --email admin@$DOMAIN \
      -d "$DOMAIN" -d "www.$DOMAIN" --redirect || \
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect
  fi
else
  warn "SSL cert TIDAK ADA di $CERT_PATH"
  log "Mendapatkan SSL certificate..."
  certbot --nginx --non-interactive --agree-tos \
    --register-unsafely-without-email \
    -d "$DOMAIN" -d "www.$DOMAIN" --redirect
fi

# ------------------------------------------------------------------------------
# STEP 6: Reload Nginx setelah semua fix
# ------------------------------------------------------------------------------
log "STEP 6: Reload Nginx..."
systemctl reload nginx
ok "Nginx direload"

# ------------------------------------------------------------------------------
# STEP 7: Restart backend dengan NODE_ENV baru (penting untuk cookie secure)
# ------------------------------------------------------------------------------
log "STEP 7: Restart backend dengan NODE_ENV=production..."
cd "$APP_DIR/hda-go-backend"
sudo -u hdago pm2 restart hda-go-backend
sleep 3

# ------------------------------------------------------------------------------
# STEP 8: Test end-to-end
# ------------------------------------------------------------------------------
log "STEP 8: Test akses ke domain..."
sleep 2

HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "https://$DOMAIN/api" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "301" ]; then
  ok "API endpoint merespons (HTTP $HTTP_CODE)"
else
  warn "API endpoint tidak merespons (HTTP $HTTP_CODE)"
fi

FRONT_CODE=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "https://$DOMAIN" 2>/dev/null || echo "000")
if [ "$FRONT_CODE" = "200" ] || [ "$FRONT_CODE" = "301" ] || [ "$FRONT_CODE" = "302" ]; then
  ok "Frontend merespons (HTTP $FRONT_CODE)"
else
  warn "Frontend tidak merespons (HTTP $FRONT_CODE)"
fi

# ------------------------------------------------------------------------------
# FINAL STATUS
# ------------------------------------------------------------------------------
echo ""
echo "================================================================"
echo "  📊 FINAL STATUS"
echo "================================================================"
echo ""
sudo -u hdago pm2 status
echo ""
systemctl status nginx --no-pager | head -10
echo ""
log "Cek log backend jika masih error:"
echo "  sudo -u hdago pm2 logs hda-go-backend --lines 50"
log "Cek log Nginx:"
echo "  sudo tail -50 /var/log/nginx/error.log"
echo ""
ok "Fix selesai. Test buka: https://$DOMAIN/login"
