#!/bin/bash
set -e

DOMAIN="stackless.cloud"
EMAIL="heramb1008@gmail.com"

echo "=== Stackless CRM Deployment ==="

# 1. Create production .env if not exists
if [ ! -f backend/.env ]; then
  echo "Creating production .env..."
  cp backend/.env.example backend/.env
  # Generate random secrets
  SECRET_KEY=$(openssl rand -hex 32)
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s|change-me-to-a-random-secret|$SECRET_KEY|g" backend/.env
  sed -i "s|change-me-to-a-random-jwt-secret|$JWT_SECRET|g" backend/.env
  sed -i "s|DEBUG=True|DEBUG=False|g" backend/.env
  sed -i "s|MONGO_URL=mongodb://localhost:27017|MONGO_URL=mongodb://mongodb:27017|g" backend/.env
  sed -i "s|CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000|CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN|g" backend/.env
  sed -i "s|BASE_URL=http://localhost:3000|BASE_URL=https://$DOMAIN|g" backend/.env
  echo "Production .env created. REVIEW AND UPDATE SMTP settings!"
fi

# 2. Create frontend .env for build
cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

# 3. Create certbot dirs
mkdir -p certbot/conf certbot/www

# 4. Get SSL certificate (first time only)
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
  echo "Getting SSL certificate..."
  # Start nginx without SSL first for ACME challenge
  docker compose up -d frontend
  docker compose run --rm certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email $EMAIL --agree-tos --no-eff-email \
    -d $DOMAIN -d www.$DOMAIN
  docker compose down
fi

# 5. Build and start
echo "Building and starting services..."
docker compose build
docker compose up -d

echo ""
echo "=== Deployment Complete ==="
echo "App: https://$DOMAIN"
echo "API: https://$DOMAIN/api/v1/health"
echo ""
echo "Run migration: docker compose exec backend python scripts/migrate_to_sop.py"
echo "Seed admin:    docker compose exec backend python scripts/seed_admin.py"
