## 1. Safe-ops guidance contract

- [ ] 1.1 在 shared types 與 `apps/server/src/services/deviceDisplayOpsService.ts` 定義 diagnostics safe-ops guidance / escalation metadata，讓 `Device Status` 與 API summary 能共用相同邊界資訊。對應 design topic: decision: keep diagnostics actions scoped to safe read or refresh flows and document the escalation path beside them.
- [ ] 1.2 調整 `apps/server/src/routes/device.ts` 與 `apps/server/src/routes/device-display-ops.ts`，把 unsupported device controls 與 safe diagnostics action 的回應整理成一致的 truthful guidance contract，直接落實 `Keep Device Status diagnostics bounded to safe read and refresh actions`。對應 design topic: decision: represent dangerous device controls as explicit unsupported operations.

## 2. Device Status and docs wiring

- [ ] 2.1 更新 `apps/web/src/pages/DeviceStatus/*` 與 API helpers，讓 diagnostics action、degraded triage 與 unsupported controls 都能顯示清楚的 runbook guidance，並直接落實 `Provide an operator-visible runbook for device diagnostics and safe operations`。
- [ ] 2.2 新增 `docs/runbooks/device-diagnostics-safe-ops.md`，並更新 `README.md` / `docs/README.md` 導覽，說明現有 safe checks、host-level restart path 與目前不支援的危險操作。對應 design topic: decision: put the operator runbook in repo docs and point to real deploy assumptions.

## 3. Verification

- [ ] 3.1 補齊 server / web tests，覆蓋 safe diagnostics metadata、unsupported-op guidance 與 `Device Status` runbook 顯示。
- [ ] 3.2 執行 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 與 `spectra analyze clarify-device-diagnostics-runbook-and-safe-ops`。
