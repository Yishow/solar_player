## 1. Circuit Settings Alignment

- [x] 1.1 完成 “Align the circuit settings page as a CRUD-focused standalone change” 並對應 ### Treat circuit settings as a CRUD-focused standalone change，明確限制本 change 只處理 `/settings/circuits`；驗證方式為內容 review，確認其他 settings routes 不在本 scope。
- [x] 1.2 完成 `circuit-settings-page-alignment` 的 `/settings/circuits` prototype 對位，讓 form/list/action composition 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html`。

## 2. CRUD Behavior Preservation

- [x] 2.1 完成 “Preserve circuit CRUD and message behavior” 並對應 ### Preserve circuit CRUD behavior before density tuning，確認 create、update、delete、load failure、message states 不回歸；驗證方式為執行 `pnpm --filter @solar-display/server test -- src/routes/circuits.test.ts`，並人工 smoke test CRUD 與 failure flow。
