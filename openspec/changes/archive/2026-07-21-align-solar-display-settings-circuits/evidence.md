# Circuit Settings Evidence

## Scope

- Route: `/settings/circuits`
- Prototype source: `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html`
- Out of scope: `/settings/mqtt`、monitoring pages、circuits API schema redesign

## Implemented alignment

- 將原本簡化的 card list 改為 prototype 導向的高密度 CRUD table。
- 新增 page-local `viewModel.ts`，集中 order、threshold、visibility、summary 與 empty/error state mapping。
- 將儲存流程改為 save-all dirty rows，避免只剩前端假狀態卻未回寫 API。
- `createCircuit()` / `updateCircuit()` / `deleteCircuit()` 現在會檢查 route `success` flag，避免 200 但 `success: false` 時被誤判為成功。

## Verification

### Automated

1. `pnpm --filter @solar-display/web test -- src/pages/CircuitSettings/viewModel.test.ts`
   - 結果：pass
2. `pnpm --filter @solar-display/web build`
   - 結果：pass
3. `pnpm --filter @solar-display/server test -- src/routes/circuits.test.ts`
   - 結果：pass

### Manual review

- 已人工對照 `10-circuit-settings.html` 的 composition，確認頁面有：
  - summary cards
  - top-level `新增迴路` / `儲存設定` actions
  - dense CRUD table
  - threshold legend
  - side feedback/status panel

## Remaining gap

- 本回合未在瀏覽器內完成 create/update/delete/load-failure 的互動 smoke；目前保留為後續 phase handoff 的人工驗證項。
