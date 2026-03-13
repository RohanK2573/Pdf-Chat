#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${APP_DOMAIN:-}" || -z "${API_DOMAIN:-}" || -z "${TLS_EMAIL:-}" ]]; then
  echo "Usage: APP_DOMAIN=app.example.com API_DOMAIN=api.example.com TLS_EMAIL=you@example.com $0"
  exit 1
fi

sudo certbot --nginx \
  -d "$APP_DOMAIN" \
  -d "$API_DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$TLS_EMAIL" \
  --redirect

sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo "TLS certificates installed and auto-renew timer enabled."
