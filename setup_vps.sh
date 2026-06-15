#!/bin/bash

# ==============================================================================
# HDA GO ECOSYSTEM - ONE-CLICK DEPLOYMENT SCRIPT (UBUNTU 24.04 LTS)
# ==============================================================================
# This script automates the installation of Node.js, PM2, Git, Nginx, Certbot SSL,
# and automatically builds and deploys the NestJS Backend and NextJS Frontend.
# ==============================================================================

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo -e "\e[31m[ERROR] Please run this script as root (sudo bash setup_vps.sh)\e[0m"
  exit 1
fi

clear
echo -e "\e[36m"
echo "  ================================================================"
echo "    🚀 HDA GO ECOSYSTEM - VPS AUTOMATION DEPLOYMENT SYSTEM        "
echo "    📍 Platform: Hostinger KVM VPS | OS: Ubuntu 24.04 LTS        "
echo "  ================================================================"
echo -e "\e[0m"

# ------------------------------------------------------------------------------
# 0. SCRIPT ARGUMENTS & DEFAULT REPO
# ------------------------------------------------------------------------------
REPO_URL=${1:-"https://github.com/haluanitcore/HDA-GO-Dashboard-System.git"}

# ------------------------------------------------------------------------------
# 1. INPUT USER CONFIGURATION
# ------------------------------------------------------------------------------
read -p "🎯 Enter your domain name (e.g., dashboardhdago.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo -e "\e[31m[ERROR] Domain name cannot be empty!\e[0m"
  exit 1
fi

read -p "📧 Enter your email address for Let's Encrypt SSL: " EMAIL
if [ -z "$EMAIL" ]; then
  echo -e "\e[31m[ERROR] Email address cannot be empty!\e[0m"
  exit 1
fi

echo -e "\n\e[32m[INFO] System Configuration:\e[0m"
echo "  - Domain: https://$DOMAIN"
echo "  - API URL: https://$DOMAIN/api"
echo "  - SSL Contact: $EMAIL"
echo "  - Target Directory: /var/www/hda-go"
echo -e "----------------------------------------------------------------"
read -p "👉 Press [ENTER] to start the deployment... (or Ctrl+C to cancel)"

# ------------------------------------------------------------------------------
# 2. UPDATE SYSTEM & INSTALL BASIC UTILITIES
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[1/8] Updating Ubuntu system packages...\e[0m"
apt update && apt upgrade -y
apt install -y git curl wget build-essential ufw nginx certbot python3-certbot-nginx libtool make g++ postgresql postgresql-contrib

# ------------------------------------------------------------------------------
# 3. CONFIGURE FIREWALL (UFW)
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[2/8] Hardening server security (UFW Firewall)...\e[0m"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ------------------------------------------------------------------------------
# 4. INSTALL NODE.JS (V20 LTS) & PM2
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[3/8] Installing Node.js LTS (v20) & Process Manager (PM2)...\e[0m"
curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/node_setup.sh
if [ -f /tmp/node_setup.sh ]; then
  bash /tmp/node_setup.sh
  rm /tmp/node_setup.sh
else
  echo -e "\e[31m[ERROR] Failed to download Node.js setup script!\e[0m"
  exit 1
fi
apt install -y nodejs

# Verify Node installation
NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo -e "\e[32m[OK] Node.js version: $NODE_VER | NPM version: $NPM_VER\e[0m"

# Install PM2 globally
npm install -g pm2
pm2 --version

# ------------------------------------------------------------------------------
# 5. CLONE REPOSITORY & CREATE SYSTEM USER
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[4/8] Preparing directories & cloning HDA GO repository...\e[0m"

# Create hdago system user if it doesn't exist
if ! id -u hdago >/dev/null 2>&1; then
  echo -e "\e[33mCreating system user 'hdago' for running services...\e[0m"
  useradd -m -s /bin/bash hdago
fi

rm -rf /var/www/hda-go
mkdir -p /var/www/hda-go
cd /var/www

# We clone the code here. If the repo is private, git will ask for credentials.
git clone "$REPO_URL" hda-go
cd /var/www/hda-go

# ------------------------------------------------------------------------------
# 6. BUILD & DEPLOY NESTJS BACKEND (PORT 4000)
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[5/8] Building NestJS Backend (Database: PostgreSQL)...\e[0m"

# Ensure PostgreSQL service is started and enabled
systemctl start postgresql
systemctl enable postgresql

# Create PostgreSQL database and user if not exists
echo -e "\e[33mConfiguring PostgreSQL database...\e[0m"
DB_PASS="HalunaIT3009?"
sudo -u postgres psql -c "CREATE USER hdago_admin WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER hdago_admin WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE hdago_prod OWNER hdago_admin;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hdago_prod TO hdago_admin;"

cd /var/www/hda-go/hda-go-backend

# Clean node_modules just in case
rm -rf node_modules dist

# Install dependencies
npm install

# Generate production environment variables
JWT_SEC=$(openssl rand -hex 32)
JWT_REF=$(openssl rand -hex 32)

cat <<EOT > .env
DATABASE_URL="postgresql://hdago_admin:$DB_PASS@localhost:5432/hdago_prod?schema=public"
JWT_SECRET="$JWT_SEC"
JWT_REFRESH_SECRET="$JWT_REF"
PORT=4000
CORS_ORIGIN="https://$DOMAIN,https://www.$DOMAIN"
EOT

echo -e "\e[32m[OK] Generated secure .env file with fresh JWT secret keys.\e[0m"

# Run Prisma schema push, generate client & seed
echo -e "\e[33mRunning database migrations & seeder...\e[0m"
npx prisma generate
npx prisma db push
npx prisma db seed

# Build backend
npm run build

# Change ownership of /var/www/hda-go to hdago user before running PM2
chown -R hdago:hdago /var/www/hda-go

# Start backend using PM2 as hdago user
sudo -u hdago pm2 delete hda-go-backend 2>/dev/null || true
sudo -u hdago pm2 start dist/main.js --name "hda-go-backend"

# ------------------------------------------------------------------------------
# 7. BUILD & DEPLOY NEXTJS FRONTEND (PORT 3000)
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[6/8] Building NextJS Frontend...\e[0m"
cd /var/www/hda-go/hda-go-frontend

# Clean node_modules just in case
rm -rf node_modules .next

# Install dependencies
npm install

# Write production frontend environment
cat <<EOT > .env.local
NEXT_PUBLIC_API_URL="https://$DOMAIN/api"
NEXT_PUBLIC_SOCKET_URL="https://$DOMAIN"
EOT

# Build frontend
npm run build

# Ensure all files are owned by hdago user
chown -R hdago:hdago /var/www/hda-go

# Start frontend using PM2 as hdago user
sudo -u hdago pm2 delete hda-go-frontend 2>/dev/null || true
sudo -u hdago pm2 start npm --name "hda-go-frontend" -- start -- -p 3000

# Save PM2 processes as hdago user
sudo -u hdago pm2 save

# Configure PM2 startup to run as hdago user
pm2 startup systemd -u hdago --hp /home/hdago

# ------------------------------------------------------------------------------
# 8. CONFIGURE NGINX REVERSE PROXY
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[7/8] Configuring Nginx Web Server Reverse Proxy...\e[0m"

NGINX_CONF="server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

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
}"

# Write config and link
echo "$NGINX_CONF" > /etc/nginx/sites-available/hda-go
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/hda-go
ln -s /etc/nginx/sites-available/hda-go /etc/nginx/sites-enabled/hda-go

# Test and reload Nginx
nginx -t && systemctl restart nginx
echo -e "\e[32m[OK] Nginx is successfully configured and running.\e[0m"

# ------------------------------------------------------------------------------
# 9. LET'S ENCRYPT SSL CERTIFICATE SETUP
# ------------------------------------------------------------------------------
echo -e "\n\e[33m[8/8] Obtaining Free SSL Let's Encrypt Certificate...\e[0m"

# Generate certificate automatically
certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" -d "www.$DOMAIN"

# Reload Nginx again to apply certificates
systemctl restart nginx

# ------------------------------------------------------------------------------
# 10. DEPLOYMENT STATUS SUMMARY
# ------------------------------------------------------------------------------
echo -e "\n\e[32m"
echo "  ================================================================"
echo "    🎉 HDA GO ECOSYSTEM IS SUCCESSFULLY DEPLOYED AND LIVE!       "
echo "  ================================================================"
echo -e "\e[0m"
echo "  🌐 URL Website:   https://$DOMAIN"
echo "  👤 API Endpoint:  https://$DOMAIN/api"
echo "  📦 Backend PM2:   Running (Port 4000)"
echo "  💻 Frontend PM2:  Running (Port 3000)"
echo "  📁 DB Location:   /var/www/hda-go/hda-go-backend/prisma/dev.db"
echo "  🛡️ SSL status:     Let's Encrypt HTTPS (Auto-renew active)"
echo -e "\n\e[36mPM2 Processes Status:\e[0m"
sudo -u hdago pm2 status
echo -e "\n\e[35mEnjoy your secure & ultra-fast Go Live website! 🚀\e[0m\n"
