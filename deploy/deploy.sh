#!/bin/bash
# Solar Display — Production Deploy Script
# Usage: bash deploy/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INSTALL_DIR="${1:-/opt/solar-display}"

echo "=== Solar Display Deploy ==="
echo "Installing to: ${INSTALL_DIR}"

# 1. Production build
echo "[1/5] Building frontend..."
cd "${PROJECT_DIR}"
pnpm run build

# 2. Create install directory
echo "[2/5] Creating install directory..."
sudo mkdir -p "${INSTALL_DIR}"
sudo mkdir -p "${INSTALL_DIR}/data"
sudo mkdir -p "${INSTALL_DIR}/logs"
sudo mkdir -p "${INSTALL_DIR}/uploads/images"
sudo mkdir -p "${INSTALL_DIR}/uploads/brand"

# 3. Copy files
echo "[3/5] Copying files..."
sudo cp -r "${PROJECT_DIR}/apps" "${INSTALL_DIR}/"
sudo cp -r "${PROJECT_DIR}/packages" "${INSTALL_DIR}/"
sudo cp "${PROJECT_DIR}/package.json" "${INSTALL_DIR}/"
sudo cp "${PROJECT_DIR}/pnpm-lock.yaml" "${INSTALL_DIR}/"
sudo cp "${PROJECT_DIR}/pnpm-workspace.yaml" "${INSTALL_DIR}/"
sudo cp "${PROJECT_DIR}/.env.example" "${INSTALL_DIR}/.env.example"

# 4. Install production dependencies
echo "[4/5] Installing dependencies..."
cd "${INSTALL_DIR}"
sudo chown -R "$USER:$USER" "${INSTALL_DIR}"
pnpm install --prod

# 5. Install systemd service
echo "[5/5] Installing systemd service..."
sudo cp "${SCRIPT_DIR}/solar-display.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable solar-display

echo ""
echo "=== Deploy complete! ==="
echo "Create env file if needed: cp ${INSTALL_DIR}/.env.example ${INSTALL_DIR}/.env"
echo "Start the service: sudo systemctl start solar-display"
echo "Check status:      sudo systemctl status solar-display"
echo "View logs:         sudo journalctl -u solar-display -f"
echo ""
echo "For kiosk mode on Raspberry Pi:"
echo "  1. Install Chromium: sudo apt install chromium-browser"
echo "  2. Add to ~/.config/lxsession/LXDE-pi/autostart:"
echo "     @chromium-browser --noerrdialogs --kiosk --incognito http://localhost:3000"
