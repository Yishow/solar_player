## 1. Shared solar story adapter

- [ ] 1.1 實作 `Drive Solar playback storytelling from the shared display-story contract`：在 `apps/web/src/services/api.ts` 與 `apps/web/src/pages/Solar/` 建立 `display-story` solar payload 的讀取與 route adapter。
- [ ] 1.2 依 `Use the server-composed solar story as the single playback source of truth`，將 flow node、KPI 與 comparison 顯示改為消費共享 `solar.kpis` / `solar.story.flowState`，不再只依賴 page-local metric 推導。

## 2. Keep layout stable

- [ ] 2.1 依 `Preserve node geometry and media config as page config concerns`，保留既有 hero、flow node、connector 與 KPI 幾何，確認這次 change 只改資料鏈，不重開 reference layout 範圍。
- [ ] 2.2 實作 `Keep Solar comparison and fallback behavior readable during partial degradation`，並依 `Treat missing comparison targets as a fallback state, not a render blocker` 明確處理 comparison target 缺值、stale story 與 request failure。

## 3. Verification

- [ ] 3.1 補齊 `apps/web/src/pages/Solar/viewModel.test.ts` 等 targeted tests，覆蓋正常、degraded、missing target 與 request failure 情境。
- [ ] 3.2 執行 `pnpm --filter @solar-display/web test -- src/pages/Solar/viewModel.test.ts src/layouts/offlineRouting.test.ts` 與 `pnpm --filter @solar-display/web build`。
