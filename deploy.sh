#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✅]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠️]${NC} $1"; }
err()   { echo -e "${RED}[❌]${NC} $1"; }

CMD="${1:-start}"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

case "$CMD" in
start)
    if ! command -v node &>/dev/null; then err "Node.js not installed — run ./setup.sh"; fi
    if [[ ! -f .env ]]; then err ".env not found — cp .env.example .env"; fi
    npx prisma generate
    info "Starting..."
    exec node src/app.js
    ;;
dev)
    npx prisma generate
    npx nodemon src/app.js
    ;;
git-push)
    info "Pushing to GitHub..."
    if [[ ! -d .git ]]; then git init; fi
    if ! git remote get-url origin &>/dev/null; then
        warn "No remote set!"
        exit 1
    fi
    git add -A
    git commit -m "$(date '+%Y-%m-%d %H:%M') update" 2>/dev/null || true
    git push -u origin main 2>/dev/null || git push -u origin master
    info "✅ Deployed!"
    ;;
*)
    echo "Usage: $0 {start|dev|git-push}"
    ;;
esac
