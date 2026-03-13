#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${APP_DOMAIN:-}" || -z "${API_DOMAIN:-}" ]]; then
  echo "Usage: APP_DOMAIN=app.example.com API_DOMAIN=api.example.com $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

APP_TEMPLATE="$ROOT_DIR/deploy/nginx/app.conf.template"
API_TEMPLATE="$ROOT_DIR/deploy/nginx/api.conf.template"

if [[ ! -f "$APP_TEMPLATE" || ! -f "$API_TEMPLATE" ]]; then
  echo "Nginx templates not found under deploy/nginx"
  exit 1
fi

APP_CONF_TMP="$(mktemp)"
API_CONF_TMP="$(mktemp)"
trap 'rm -f "$APP_CONF_TMP" "$API_CONF_TMP"' EXIT

sed "s/__APP_DOMAIN__/$APP_DOMAIN/g" "$APP_TEMPLATE" > "$APP_CONF_TMP"
sed "s/__API_DOMAIN__/$API_DOMAIN/g" "$API_TEMPLATE" > "$API_CONF_TMP"

sudo cp "$APP_CONF_TMP" "/etc/nginx/sites-available/$APP_DOMAIN.conf"
sudo cp "$API_CONF_TMP" "/etc/nginx/sites-available/$API_DOMAIN.conf"

sudo ln -sf "/etc/nginx/sites-available/$APP_DOMAIN.conf" "/etc/nginx/sites-enabled/$APP_DOMAIN.conf"
sudo ln -sf "/etc/nginx/sites-available/$API_DOMAIN.conf" "/etc/nginx/sites-enabled/$API_DOMAIN.conf"

sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "Nginx configured for $APP_DOMAIN and $API_DOMAIN"
