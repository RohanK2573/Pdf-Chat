#!/usr/bin/env bash
set -euo pipefail

# Start only infra still hosted on EC2 (no local Postgres in RDS setup).
docker compose up -d valkey qdrant

echo "Started services: valkey, qdrant"
docker compose ps
