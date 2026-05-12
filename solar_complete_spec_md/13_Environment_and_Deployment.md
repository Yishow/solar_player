# Environment and Deployment Spec

## 1. 開發環境

```bash
node -v   # 建議 20+
npm -v
```

## 2. 開發啟動

```bash
npm install
npm run dev
```

建議 scripts：

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:server\"",
    "dev:web": "npm --workspace apps/web run dev",
    "dev:server": "npm --workspace apps/server run dev",
    "build": "npm run build:web && npm run build:server",
    "build:web": "npm --workspace apps/web run build",
    "build:server": "npm --workspace apps/server run build",
    "start": "node apps/server/dist/index.js"
  }
}
```

## 3. Raspberry Pi 部署

### systemd service

```ini
[Unit]
Description=Kuozui Green Energy Display
After=network.target

[Service]
WorkingDirectory=/opt/solar-display
ExecStart=/usr/bin/node apps/server/dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Chromium kiosk

```bash
chromium-browser --kiosk http://localhost:3000
```

## 4. 檔案路徑

```txt
/opt/solar-display/
  data/solar-display.sqlite
  uploads/images/
  logs/
```

## 5. 備份策略

建議每日備份：

```bash
sqlite3 /opt/solar-display/data/solar-display.sqlite ".backup '/opt/solar-display/backups/solar-display-$(date +%F).sqlite'"
```

## 6. 安全注意事項

本版不使用登入 / 權限：

- 建議部署於內網。
- 不建議直接暴露至公網。
- 可用 nginx / firewall 限制來源 IP。
- 若將來接外網，應補 auth middleware。
