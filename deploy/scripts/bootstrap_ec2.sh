#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 24.04 bootstrap for app runtime dependencies.
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl unzip build-essential nginx docker.io docker-compose-v2 certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

sudo usermod -aG docker "$USER" || true
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

echo "Bootstrap complete. Re-login (or run 'newgrp docker') before using Docker without sudo."
