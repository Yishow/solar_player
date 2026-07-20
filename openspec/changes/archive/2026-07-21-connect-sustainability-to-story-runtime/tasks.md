## 1. Sustainability story adapter

- [x] 1.1 在 `apps/web/src/services/api.ts` 與 `apps/web/src/pages/Sustainability/` 建立 `/api/sustainability-story` 的讀取與 route adapter。
- [x] 1.2 實作 `Resolve Sustainability provenance from the shared story runtime`、`Use one selected period across Sustainability runtime blocks` 與 `Drive Sustainability story modules from the shared runtime payload`，把 period selector、big numbers、provenance、highlight rail 與 modules 改為消費共享 story payload。

## 2. Fallback handling

- [x] 2.1 依 `Use one sustainability story payload for all periodized runtime blocks` 與 `Preserve page config as visual layout only`，保留既有 display page config 與 FHD 版型，確認這次 change 只處理 runtime content 來源。
- [x] 2.2 依 `Fallback incomplete story content without collapsing the page`，明確處理缺 period、缺 provenance、缺 modules 與 request failure，讓頁面仍可播放且內容可讀。

## 3. Verification

- [x] 3.1 補齊 `apps/web/src/pages/Sustainability/viewModel.test.ts` 與相關 render tests，覆蓋正常、period 切換、partial story 與 request failure 情境。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test -- src/pages/Sustainability/viewModel.test.ts src/pages/Sustainability/configRender.test.ts` 與 `pnpm --filter @solar-display/web build`。
