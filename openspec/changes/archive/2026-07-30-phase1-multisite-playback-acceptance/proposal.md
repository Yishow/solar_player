## Why

Phase 1 的完成條件不是單一 API 或管理頁可用，而是約 50 台已配對 Client 在同一 Server 下維持廠區隔離、穩定 heartbeat／time broadcast 與可預期重連。需要可重跑的 load harness、部署驗證與正式 runbook 才能接受上線。

## What Changes

- 建立至少 50 個已配對 Client 的 load harness，涵蓋 10 秒 heartbeat、30 秒 time broadcast、同時 reconnect、Profile sync 與 CL／KN rotation request。
- 驗證 request rate 有界、相同 Profile＋Site 不做 N 倍重算、無 event storm、reconnect 後 retained connection entries 不持續成長。
- 以公開 Management API → Pairing → Authenticated Playback Request 驗證停用、撤銷、重新配對與兩個 Site 的資料隔離。
- 擴充 thin kiosk 驗證：專用 Firefox Profile 存在、Cookie 跨重啟、Server URL 可達、Time Signal 可收、Heartbeat 含 Device 與 Time 狀態。
- 補齊架構、資料遷移、API compatibility、配對安全、Site isolation、時間協議、Windows／Pi 部署、故障排除與 50-client 測試矩陣文件。

## Capabilities

### New Capabilities

- phase1-multisite-playback-acceptance: 定義 Phase 1 的端到端、負載、部署與文件驗收證據。

### Modified Capabilities

(none)

## Impact

- Affected specs: phase1-multisite-playback-acceptance
- Affected code:
  - New: scripts/device-scoped-playback-load.mjs, scripts/device-scoped-playback-load.test.mjs, docs/architecture/device-scoped-multisite-playback.md, docs/ops/device-pairing-and-recovery.md, docs/ops/device-scoped-playback-test-matrix.md
  - Modified: deploy/verify-thin-kiosk.sh, deploy.md, scripts/verify.mjs, package.json
  - Removed: none
