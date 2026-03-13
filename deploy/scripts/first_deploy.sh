#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR/server"
npm install
npm run migrate

cd "$ROOT_DIR/client/my-app"
npm install
npm run build

cd "$ROOT_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo "First deploy completed. Verify with: pm2 status"
