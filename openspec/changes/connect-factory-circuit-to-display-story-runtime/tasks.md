## 1. Factory story route adapter

- [x] 1.1 實作 `Drive Factory Circuit playback from the shared display-story slot contract`：在 `apps/web/src/services/api.ts` 與 `apps/web/src/pages/FactoryCircuit/` 建立 `display-story` factory payload 的讀取與 route adapter。
- [x] 1.2 依 `Use display-story for playback and circuits API for governance` 與 `Avoid page-local reconstitution of slot binding semantics`，將播放頁的 slot rows、summary 與 alert 狀態改為消費共享 `factoryCircuit` payload，而不是只依賴 `/api/circuits` 和 page-local fallback。

## 2. Boundary cleanup

- [x] 2.1 保留 `/api/circuits` 給設定面使用，確認播放頁不再把 circuits CRUD payload 當作主故事來源。
- [x] 2.2 實作 `Preserve readable playback when slot story data is degraded`，並依 `Keep empty, loading, and degraded states visible` 明確處理 request failure、missing slot binding、conflict 與 missing live power 的畫面 fallback。

## 3. Verification

- [x] 3.1 補齊 `apps/web/src/pages/FactoryCircuit/viewModel.test.ts` 與相關 render tests，覆蓋 bound、missing、conflict、fallback 與 request failure 情境。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/viewModel.test.ts src/pages/FactoryCircuit/configRender.test.ts` 與 `pnpm --filter @solar-display/web build`。
