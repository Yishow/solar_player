## 1. Summary Contract Separation

- [x] 1.1 完成 `Keep display-readiness focused on configuration prerequisites`，讓 `Extend Device Status with display operations summary` 在 `device-display-ops` 聚合時保留 configuration readiness 的獨立計數來源，不再把 readiness findings 混成 operational degradation；驗證方式為補齊 `apps/server/src/routes/device-display-ops.test.ts` 並執行 `pnpm --filter @solar-display/server test`。
- [x] 1.2 完成 `Tag device display alerts with their domain before aggregation`，讓 `Show display readiness and skip alerts in Device Status` 的每筆 alert 都帶出 `configuration-readiness` 或 `operational-health` domain，且 triage 仍可從合併 alerts 中解析主因；驗證方式為 server regression tests 加上 `pnpm --filter @solar-display/server test`。

## 2. Device Status Presentation

- [x] 2.1 完成 `Surface separated configuration readiness and operational health summaries in Device Status`，讓 `Extend Device Status with display operations summary` 以分開的 readiness/operational summary labels、helper 與 diagnostics feedback 呈現，不再只依賴單一 blocking/degraded 數字；驗證方式為更新 `DeviceStatus` view model/content tests 並執行 `pnpm --filter @solar-display/web test`。
- [x] 2.2 補齊 `Show display readiness and skip alerts in Device Status` 的回歸矩陣，確認 readiness alert 與 operational alert 在 UI 上維持可區分，且 counts 不再雙算，並以 `spectra analyze separate-configuration-readiness-from-operational-health`、`spectra validate separate-configuration-readiness-from-operational-health --strict` 驗證 artifact 完整性。
