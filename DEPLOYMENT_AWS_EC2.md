# AWS Deployment (EC2 + RDS + Nginx + PM2)

This guide deploys:
- `https://app.<your-domain>` -> Next.js app (`client/my-app`, local port `3000`)
- `https://api.<your-domain>` -> Express API (`server`, local port `8000`)

Runtime model:
- EC2 hosts app processes (PM2), Nginx, Valkey, Qdrant
- RDS hosts PostgreSQL
- S3 stores uploaded PDFs

## 1) AWS prerequisites

1. Create Ubuntu 24.04 EC2 (recommended: `t3.medium` or larger).
2. Attach Elastic IP.
3. Security Group inbound: `22`, `80`, `443` only.
4. Create private RDS PostgreSQL (same VPC/subnets), allow inbound from EC2 SG only.
5. Route53 records:
   - `A app.<your-domain>` -> EC2 Elastic IP
   - `A api.<your-domain>` -> EC2 Elastic IP
6. Attach IAM role to EC2 with S3 permissions (`s3:GetObject`, `s3:PutObject`, optional `s3:ListBucket`).

## 2) Bootstrap EC2

SSH into EC2 and run:

```bash
git clone <your-repo-url> /home/ubuntu/PDF-Scanner
cd /home/ubuntu/PDF-Scanner
bash deploy/scripts/bootstrap_ec2.sh
```

Then re-login (or run `newgrp docker`) so Docker group access is active.

## 3) Configure environment files

### Backend env

```bash
cp server/.env.production.example server/.env
nano server/.env
```

Required values:
- `DATABASE_URL=postgresql://...@<rds-endpoint>:5432/...`
- `CLERK_JWT_ISSUER`
- model provider keys (`GOOGLE_API_KEY` and/or `OPENAI_API_KEY`)
- `AWS_REGION`, `S3_BUCKET_NAME`

Keep:
- `REDIS_HOST=localhost`
- `QDRANT_URL=http://localhost:6333`

### Frontend env

```bash
cp client/my-app/.env.production.example client/my-app/.env.local
nano client/my-app/.env.local
```

Set:
- `NEXT_PUBLIC_API_BASE_URL=https://api.<your-domain>`
- Clerk publishable/secret keys

## 4) Start local infra (Valkey + Qdrant)

```bash
cd /home/ubuntu/PDF-Scanner
bash deploy/scripts/start_infra.sh
```

## 5) Configure Nginx + TLS

```bash
cd /home/ubuntu/PDF-Scanner
APP_DOMAIN=app.<your-domain> API_DOMAIN=api.<your-domain> bash deploy/scripts/setup_nginx.sh
TLS_EMAIL=<you@example.com> APP_DOMAIN=app.<your-domain> API_DOMAIN=api.<your-domain> bash deploy/scripts/setup_tls.sh
```

Templates used:
- `deploy/nginx/app.conf.template`
- `deploy/nginx/api.conf.template`

## 6) First deployment

```bash
cd /home/ubuntu/PDF-Scanner
bash deploy/scripts/first_deploy.sh
```

This runs:
- `npm install` (server + client)
- `npm run migrate` (server)
- `npm run build` (client)
- `pm2 start ecosystem.config.cjs`
- `pm2 save && pm2 startup`

## 7) Ongoing manual deploy

```bash
cd /home/ubuntu/PDF-Scanner
bash deploy/scripts/redeploy.sh
```

This runs `git pull`, conditionally installs deps, runs migrations when needed, rebuilds frontend, then `pm2 reload all`.

## 8) Verification

```bash
curl -I https://app.<your-domain>
curl https://api.<your-domain>/
pm2 status
pm2 logs pdf-scanner-api --lines 100
pm2 logs pdf-scanner-worker --lines 100
sudo nginx -t
```

Expected API health response includes:

```json
{"status":"allgood"}
```

## 9) Failure checks

1. Stop worker and verify ingestion halts:
   ```bash
   pm2 stop pdf-scanner-worker
   ```
2. Restart worker and verify recovery:
   ```bash
   pm2 start pdf-scanner-worker
   ```
3. Temporarily set bad `DATABASE_URL` in `server/.env` and confirm startup failure in PM2 logs.
4. Upload a larger PDF to validate Nginx `client_max_body_size 50m` behavior.

## 10) Notes

- `ecosystem.config.cjs` is now path-safe and uses repo-relative absolute paths.
- Node processes stay internal (`127.0.0.1` via Nginx proxy). Only `80/443` are publicly exposed.
- Do not commit real `.env` files; use checked-in `*.example` templates.
