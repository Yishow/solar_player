## 1. Factory Circuit Alignment

- [x] 1.1 完成 “Align the factory circuit page as a standalone flow-heavy playback batch” 並對應 ### Treat factory circuit as a standalone flow-heavy playback batch，明確限制本 change 只處理 `/factory-circuit`；驗證方式為內容 review，確認其他 playback routes 不在本 scope。
- [x] 1.2 完成 `playback-factory-circuit-alignment` 的 `/factory-circuit` prototype 對位，讓 flow node、connector、circuit card density 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`。

## 2. Circuit Behavior Preservation

- [x] 2.1 完成 “Preserve circuit threshold and empty-state behavior” 並對應 ### Centralize circuit threshold and empty-state mapping，集中定義 threshold/status/empty-state mapping；驗證方式為 code review，確認 `warningMin`、`attentionMin` 與 empty state 不散落在多個 JSX 分支。
- [x] 2.2 完成空資料與 playback route contract 驗證，確認 circuits API 回空或離線時頁面仍完整；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查空資料與離線情境不破版。
