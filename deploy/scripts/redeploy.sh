#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BEFORE_REV="$(git rev-parse HEAD)"
git pull
AFTER_REV="$(git rev-parse HEAD)"

if [[ "$BEFORE_REV" == "$AFTER_REV" ]]; then
  echo "Repository already up to date."
  pm2 reload all
  echo "PM2 reload completed."
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$BEFORE_REV" "$AFTER_REV")"

if echo "$CHANGED_FILES" | grep -Eq 'server/package-lock.json|server/package.json'; then
  (cd server && npm install)
fi

if echo "$CHANGED_FILES" | grep -Eq 'client/my-app/package-lock.json|client/my-app/package.json'; then
  (cd client/my-app && npm install)
fi

if echo "$CHANGED_FILES" | grep -Eq '^server/drizzle/|server/db/schema.js'; then
  (cd server && npm run migrate)
fi

(cd client/my-app && npm run build)
pm2 reload all

echo "Redeploy completed."
