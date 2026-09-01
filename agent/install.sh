#!/bin/bash
# Monitoring agent installer.
#
# Always installs from a fresh clone of the repository (never a manually
# copied directory), so a newly added server can never start out on stale
# agent code — the exact problem that made a VirtualBox VM look like it had
# a detection bug when it was actually just running an old collector.py.
#
# Usage:
#   sudo ./install.sh --api-url http://backend:3000 --server-id vm-2 \
#                      --server-name "VM Test" --location "Local"
#   sudo ./install.sh                 # prompts interactively for anything missing
#
# Safe to re-run: an existing install at $INSTALL_DIR is updated in place
# (git pull) rather than re-cloned, and the systemd unit/service are
# refreshed idempotently.

set -euo pipefail

REPO_URL="https://github.com/MariemChaabani-hub/DevOps-Monitoring-App.git"
REPO_BRANCH="main"
INSTALL_DIR="/opt/monitoring-agent"
SERVICE_NAME="monitoring-agent"
LOG_DIR="/var/log/monitoring-agent"

API_URL=""
SERVER_ID=""
SERVER_NAME=""
SERVER_LOCATION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url) API_URL="$2"; shift 2 ;;
    --server-id) SERVER_ID="$2"; shift 2 ;;
    --server-name) SERVER_NAME="$2"; shift 2 ;;
    --location) SERVER_LOCATION="$2"; shift 2 ;;
    --install-dir) INSTALL_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--api-url URL] [--server-id ID] [--server-name NAME] [--location LOC] [--install-dir DIR]"
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "[ERROR] This script must be run as root (needed for systemd, /opt, /var/log)." >&2
  echo "        Re-run with: sudo $0 $*" >&2
  exit 1
fi

# Prompt for anything not passed as a flag, but only if we actually have a
# TTY — a non-interactive run (CI, remote provisioning) must fail loudly on
# missing required values instead of hanging on a read.
prompt_if_missing() {
  local varname="$1" prompt="$2" default="$3"
  local current="${!varname}"
  if [[ -n "$current" ]]; then
    return
  fi
  if [[ -t 0 ]]; then
    read -r -p "$prompt [$default]: " value
    printf -v "$varname" '%s' "${value:-$default}"
  else
    printf -v "$varname" '%s' "$default"
  fi
}

prompt_if_missing API_URL "URL de l'API backend" "http://localhost:3000"
prompt_if_missing SERVER_ID "Identifiant du serveur (server_id)" "$(hostname)"
prompt_if_missing SERVER_NAME "Nom affiché du serveur" "$(hostname)"
prompt_if_missing SERVER_LOCATION "Emplacement du serveur" "Unknown"

echo "=================================================================="
echo " Installation de l'agent de monitoring"
echo "=================================================================="
echo " Dépôt          : $REPO_URL ($REPO_BRANCH)"
echo " Répertoire     : $INSTALL_DIR"
echo " API backend    : $API_URL"
echo " server_id      : $SERVER_ID"
echo " server_name    : $SERVER_NAME"
echo " location       : $SERVER_LOCATION"
echo "=================================================================="

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 introuvable — installez-le avant de relancer ce script." >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "[ERROR] git introuvable — installez-le avant de relancer ce script." >&2
  exit 1
fi

# Clone (or update, on re-run) — never a manual file copy, so every install
# starts from the exact code at the tip of the branch.
if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "[INFO] Installation existante détectée — mise à jour vers la dernière version..."
  git -C "$INSTALL_DIR" fetch --depth 1 origin "$REPO_BRANCH"
  git -C "$INSTALL_DIR" reset --hard "origin/$REPO_BRANCH"
else
  echo "[INFO] Clonage du dépôt..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

AGENT_DIR="$INSTALL_DIR/agent"
cd "$AGENT_DIR"

echo "[INFO] Création de l'environnement virtuel Python..."
python3 -m venv venv
venv/bin/pip install --quiet --upgrade pip
venv/bin/pip install --quiet -r requirements.txt

echo "[INFO] Configuration de l'agent..."
mkdir -p "$LOG_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi
# Only touch the keys install.sh is responsible for — anything the admin
# already customized in .env stays untouched on a re-run.
if grep -q '^API_BASE_URL=' .env; then
  sed -i "s|^API_BASE_URL=.*|API_BASE_URL=$API_URL|" .env
else
  echo "API_BASE_URL=$API_URL" >> .env
fi
if grep -q '^LOG_FILE=' .env; then
  sed -i "s|^LOG_FILE=.*|LOG_FILE=$LOG_DIR/agent.log|" .env
else
  echo "LOG_FILE=$LOG_DIR/agent.log" >> .env
fi
chmod 600 .env

# server_id/name/location live in config.json (main.py's MONITORING_SERVER_*
# env vars would also work, but config.json is what every other install
# path in this repo already uses — one place to look, not two).
venv/bin/python3 - "$SERVER_ID" "$SERVER_NAME" "$SERVER_LOCATION" <<'PYEOF'
import json
import sys

server_id, server_name, location = sys.argv[1:4]
with open('config.json') as f:
    config = json.load(f)
config.setdefault('server', {})
config['server']['id'] = server_id
config['server']['name'] = server_name
config['server']['location'] = location
with open('config.json', 'w') as f:
    json.dump(config, f, indent=2)
PYEOF

echo "[INFO] Installation du service systemd..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNITEOF
[Unit]
Description=Intelligent Server Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${AGENT_DIR}
ExecStart=${AGENT_DIR}/venv/bin/python3 ${AGENT_DIR}/main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PATH=${AGENT_DIR}/venv/bin"

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "=================================================================="
echo " Terminé. Statut du service :"
echo "=================================================================="
systemctl --no-pager status "$SERVICE_NAME" || true
echo
echo "Logs en direct : sudo journalctl -u $SERVICE_NAME -f"
