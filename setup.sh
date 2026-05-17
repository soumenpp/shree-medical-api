#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✅]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠️]${NC} $1"; }
err()   { echo -e "${RED}[❌]${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}━━━ $1 ━━━${NC}"; }

if [[ $EUID -ne 0 ]]; then err "Please run as root (sudo)."; fi

# Detect mode
if [[ -n "${BASH_SOURCE:-}" && -f "${BASH_SOURCE[0]}" ]]; then
    PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    REPO_URL="https://github.com/soumenpp/medical-store-backend.git"
    TARGET_DIR="/root/medical-store-backend"
    info "Cloning from $REPO_URL"
    git clone --depth=1 "$REPO_URL" "$TARGET_DIR"
    PROJECT_DIR="$TARGET_DIR"
fi
cd "$PROJECT_DIR"
info "Project: $PROJECT_DIR"

# ── System deps ────────────────────────────────────────────
step "System Dependencies"
apt-get update -qq
apt-get install -y -qq curl git postgresql postgresql-client || info "DB setup may need manual config"
info "System packages installed"

# ── Node.js ────────────────────────────────────────────────
step "Node.js"
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
info "Node $(node -v) / npm $(npm -v)"

# ── Install deps ───────────────────────────────────────────
step "Dependencies"
npm install
info "Node modules installed"

# ── .env ───────────────────────────────────────────────────
step "Configuration"
if [[ -f .env ]]; then
    warn ".env exists — keeping your config"
else
    cp .env.example .env
    info "Created .env — EDIT IT: nano .env"
fi

# ── Prisma (DB) ────────────────────────────────────────────
step "Database"
npx prisma generate
info "Prisma client generated"
warn "Run these manually after DB is ready:"
warn "  npx prisma migrate dev"
warn "  npx prisma db seed"

# ── systemd service ───────────────────────────────────────
step "Systemd Service"
SERVICE_FILE="/etc/systemd/system/medical-store.service"

if [[ -f "$SERVICE_FILE" ]]; then
    warn "Service exists — skipping"
else
    cat > "$SERVICE_FILE" << SERVEOF
[Unit]
Description=Medical Store Backend
After=network.target

[Service]
User=root
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVEOF
    systemctl daemon-reload
    info "Service created"
fi

# ── Start ──────────────────────────────────────────────────
step "Start"
systemctl enable medical-store.service
systemctl restart medical-store.service
sleep 2

if systemctl is-active --quiet medical-store.service; then
    info "Medical Store API is RUNNING! 🎉"
else
    err "Failed — check: journalctl -u medical-store -n 20"
fi

step "Done"
echo -e "  ${BOLD}API:${NC}  http://localhost:5000"
echo -e "  ${BOLD}Logs:${NC} journalctl -u medical-store -f"
