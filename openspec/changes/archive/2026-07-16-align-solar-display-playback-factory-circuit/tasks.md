## 1. Factory Circuit Alignment

- [x] 1.1 完成 “Align the factory circuit page as a standalone flow-heavy playback batch” 並對應 ### Treat factory circuit as a standalone flow-heavy playback batch，明確限制本 change 只處理 `/factory-circuit`；驗證方式為內容 review，確認其他 playback routes 不在本 scope。
- [x] 1.2 完成 `playback-factory-circuit-alignment` 的 `/factory-circuit` prototype 對位，讓 flow node、connector、circuit card density 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`。

## 2. Circuit Behavior Preservation

- [x] 2.1 完成 “Preserve circuit threshold and empty-state behavior” 並對應 ### Centralize circuit threshold and empty-state mapping，集中定義 threshold/status/empty-state mapping；驗證方式為 code review，確認 `warningMin`、`attentionMin` 與 empty state 不散落在多個 JSX 分支。
- [x] 2.2 完成空資料與 playback route contract 驗證，確認 circuits API 回空或離線時頁面仍完整；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查空資料與離線情境不破版。

## 3. Jungli Persisted Layout Compatibility

- [x] 3.1 先在 `apps/server/src/db/migrations/factoryCircuitJungliRows.test.ts` 建立 legacy base/draft/live config、legacy circuit rows與錯誤 office topic 名稱 fixture，證明 migration 前會出現 `office.top=431`、重複裝配文案與 legacy rows；驗證目標為該 focused test 在 migration 尚未加入時失敗。
- [x] 3.2 完成 “Normalize legacy persisted Jungli configuration”，依 “Migrate persisted editor data instead of bypassing it” 與 “Normalize legacy circuit metadata conservatively” 使用 023 正規化 circuit/topic metadata，並以 `024_fix_factory_circuit_jungli_region_rows.sql` 修正 persisted envelope 的 `regions.loadRows/loadRowStates`、移除 023 誤加的 root keys、保留其他 JSON fields 且不修改 Guanyin；驗證目標為真實 nested fixture 通過並重跑 024 後資料不再變動。
- [x] 3.3 完成 “Center the six Jungli project rows on the switchboard routing line”，驗證 `apps/web/src/pages/FactoryCircuit/layout.ts` 的六列座標與 connector contract，並以 `apps/web/src/pages/FactoryCircuit/layout.test.ts` 證明 84px 高度、95px step、不重疊及群組中心 Y=440；驗證目標為 `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/layout.test.ts` 通過。

## 4. Deployment Witness and Closeout

- [x] 4.1 執行 `pnpm verify`、migration focused test、FactoryCircuit focused test、app-update health retry focused test、`git diff --check` 與 `spectra validate align-solar-display-playback-factory-circuit`，所有 gate 必須成功後才可部署。
- [x] 4.2 使用 app-update 部署到 `kz@100.99.99.2`，確認 migration 已套用且 service/health 正常；驗證目標為 live config 只含 current six-slot geometry、circuits API 不再回傳 enabled legacy rows、display story 的 office label 為「事務系」。
- [x] 4.3 擷取 `http://100.99.99.2:3000/factory-circuit?autoplay=0` fresh 1920x1080 witness，確認六列無重疊、事務系沒有誤標、routing center 與配電盤 Y=440 對齊，將 evidence 路徑與 pending human acceptance 狀態記錄到 change；最終視覺 acceptance 由使用者決定。
