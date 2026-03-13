# Deploy Folder Guide

This folder contains production deployment helpers for:
- EC2 app host (Nginx + PM2)
- RDS PostgreSQL
- Subdomains (`app.<domain>`, `api.<domain>`)

Use this guide for first-time setup and routine deploys.

## 1) First-time setup on EC2 (copy/paste order)

```bash
# 1) Clone repo
cd /home/ubuntu
git clone <your-repo-url> PDF-Scanner
cd /home/ubuntu/PDF-Scanner

# 2) Install system dependencies (node, docker, nginx, certbot, pm2)
bash deploy/scripts/bootstrap_ec2.sh

# 3) Re-login OR enable docker group in current shell
newgrp docker

# 4) Create backend env from template
cp server/.env.production.example server/.env
nano server/.env

# 5) Create frontend env from template
cp client/my-app/.env.production.example client/my-app/.env.local
nano client/my-app/.env.local

# 6) Start local infra services still on EC2
bash deploy/scripts/start_infra.sh

# 7) Configure Nginx subdomains
APP_DOMAIN=app.<your-domain> API_DOMAIN=api.<your-domain> bash deploy/scripts/setup_nginx.sh

# 8) Enable TLS certs + HTTPS redirect
TLS_EMAIL=<you@example.com> APP_DOMAIN=app.<your-domain> API_DOMAIN=api.<your-domain> bash deploy/scripts/setup_tls.sh

# 9) Run first app deploy
bash deploy/scripts/first_deploy.sh
```

## 2) Day-2 manual deploy (copy/paste)

```bash
cd /home/ubuntu/PDF-Scanner
bash deploy/scripts/redeploy.sh
```

## 3) Quick checks

```bash
curl -I https://app.<your-domain>
curl https://api.<your-domain>/
pm2 status
pm2 logs pdf-scanner-api --lines 100
pm2 logs pdf-scanner-worker --lines 100
sudo nginx -t
```

## 4) Optional GitHub Actions deploy

A workflow exists at `.github/workflows/deploy-ec2.yml`.

It SSHes into EC2 and runs:

```bash
cd /home/ubuntu/PDF-Scanner
bash deploy/scripts/redeploy.sh
```

Required repository secrets:
- `EC2_HOST` (public host or IP)
- `EC2_USER` (for example `ubuntu`)
- `EC2_SSH_PRIVATE_KEY` (private key content)

Optional secrets:
- `EC2_PORT` (default: `22`)
- `EC2_PROJECT_PATH` (default: `/home/ubuntu/PDF-Scanner`)

## 5) Script reference

- `bootstrap_ec2.sh`: install runtime dependencies.
- `start_infra.sh`: start `valkey` + `qdrant` only.
- `setup_nginx.sh`: write and enable Nginx site configs from templates.
- `setup_tls.sh`: provision certs using Certbot.
- `first_deploy.sh`: install/build/migrate and start PM2 apps.
- `redeploy.sh`: pull latest code and reload app safely.
