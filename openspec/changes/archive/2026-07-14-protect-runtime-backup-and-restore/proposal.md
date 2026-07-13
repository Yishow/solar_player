## Why

Pi update 會在啟動時自動套用尚未執行的 SQLite migrations，但 one-key update 在覆蓋應用程式前沒有強制建立可驗證 backup；現有 export 只在 service 執行中發出警告，且包含 .env 的 archive 沒有 owner-only permission gate。部署失敗或 migration 出錯時，operator 目前缺少經過 drill 的 restore contract。

## What Changes

- one-key update 在複製新 bundle 前必須停止 service、建立 timestamped runtime archive，並在 backup 驗證失敗時 fail closed。
- archive manifest 記錄 release identity、schema versions、內容清單與 checksums；archive 與 .env 強制 owner-only permissions。
- 提供明確 restore helper，可還原到指定 temp 或 install root，並執行 checksum、SQLite integrity、migration 與 health drill。
- 保留上一版 application rollback material；更新失敗不得自動覆蓋可能已產生的新資料。
- 部署 dry-run、tests 與 handoff 文件呈現 backup、restore 與 rollback stages。

## Non-Goals

- 不把 backups 上傳雲端或建立長期排程備份服務。
- 不自動回滾 production database。
- 不改 SQLite schema 或 readonly-root writable boundary。
- 不在此 change 直接操作 production Pi。

## Capabilities

### New Capabilities

- `runtime-backup-and-restore`: 定義安全 snapshot、secret permissions、manifest、restore drill 與 rollback material。

### Modified Capabilities

- `raspi-onekey-kiosk-deployment`: update deployment 在覆蓋 application bundle 前新增 fail-closed backup gate 與可觀察的 restore handoff。

## Impact

- Affected specs: `runtime-backup-and-restore`, `raspi-onekey-kiosk-deployment`
- Affected code:
  - Modified: `deploy/export-runtime-state.sh`, `deploy/raspi-bootstrap.sh`, `scripts/raspi-onekey-deploy.sh`, `scripts/deploy.test.mjs`, `README.md`, `deploy.md`
  - New: `deploy/restore-runtime-state.sh`
  - Removed: none
