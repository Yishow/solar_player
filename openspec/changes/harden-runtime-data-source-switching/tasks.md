## 1. Runtime source state

- [ ] 1.1 新增 active/desired data-source runtime state 與 shared response types。
- [ ] 1.2 建立 `DataSourceRuntimeCoordinator`，集中管理 mock feed、MQTT active client、transition 與 shutdown。
- [ ] 1.3 讓 server startup 從 coordinator 啟動來源，不再直接決定 mock feed lifecycle。

## 2. Safe switching

- [ ] 2.1 實作 mock → MQTT preflight、handoff、failure rollback 與狀態持久化。
- [ ] 2.2 實作 MQTT → mock 的 reconnect disable、client close、lease release、mock start 順序。
- [ ] 2.3 為 MQTT client event handlers 加 current-generation guard，確保 stale client 無法復活或覆寫狀態。
- [ ] 2.4 修正 partial MQTT settings update，所有 omitted fields 保留 current persisted value。

## 3. Management surface

- [ ] 3.1 擴充 MQTT settings API 回傳 desired mode、active mode、transition state 與 bounded error。
- [ ] 3.2 更新 MQTT Settings 顯示 pending/active/failed source transition，保留既有 broker diagnostics。

## 4. Verification

- [ ] 4.1 新增 mock→MQTT 與 MQTT→mock 不重啟 server 的整合測試。
- [ ] 4.2 新增 partial/empty settings update 保值測試。
- [ ] 4.3 新增 initial connect failure、stale reconnect event 與 lease handoff regression tests。
- [ ] 4.4 跑 server/web targeted tests、root `pnpm test`、`pnpm build` 與 `pnpm verify`。
