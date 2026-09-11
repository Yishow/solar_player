## 1. Readiness contract

- [x] 1.1 新增 persisted config validator，覆蓋 missing/malformed/empty/incomplete factories、duplicate id、invalid URL 與 secret-safe error。
- [x] 1.2 驗證完整多廠格式與 legacy 單廠格式維持相容。

## 2. Data-plane gate

- [x] 2.1 `run`、`once`、legacy `--once`、`test-login`、`dump-api` 統一在 dispatch 前 fail closed。
- [x] 2.2 invalid config 的 tray 保留本機 WebUI，但阻止正式 MQTT/data-plane，並提示儲存後重新啟動。
- [x] 2.3 保持 `test-mqtt`、`history`、`alerts` 不受 factory readiness gate 影響。

## 3. Review and verification

- [x] 3.1 對新增 Go 檔執行 `gofmt` 並人工 code review，檢查 secret leakage、legacy compatibility、CLI bypass 與 tray 行為。
- [x] 3.2 修正 review 發現：避免把 compatibility defaults 當 readiness 證據；tray 不宣稱 hot reload，invalid session 明確要求 restart。
- [ ] 3.3 執行完整 `go test ./...` / `pnpm verify`：目前執行環境無法 clone GitHub 或取得完整 workspace，待 GitHub CI/可執行 workspace 驗證；不可宣稱已通過。
