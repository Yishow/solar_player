## 1. Editor foundation

- [x] 1.1 實作 `Provide a dedicated display page editor foundation route`：management shell 內出現獨立 display editor 入口，且 editor route 可切換五個 display 頁面的畫布；以 `pnpm --filter @solar-display/web build` 與手動確認 page switcher 可見為驗證。
- [x] 1.2 實作 `Toggle display page editor foundation mode with the E key inside the editor route`：editor route 內按 `E` 可切換 edit mode，而正式 display routes 不會進入 editor 狀態；以 editor route 手動操作與既有 playback routing tests 不回歸為驗證。
- [x] 1.3 依 `Keep the editor interaction inside a dedicated management route, not the production playback routes` 與 `Surface selectable editable regions with an inspector in the display page editor foundation` 建立 selection overlay、inspector 與 selected region state；以手動選取頁面區塊後 inspector 跟隨更新為驗證。

## 2. Shared config envelope

- [x] 2.1 實作 `Persist display page component editing configuration for all five display pages` 的 shared schema、server route 與 seed-backed fallback，讓五個 display 頁都能讀取或回退到 page-local seed values；以 server targeted tests 與手動清空 persisted config 後各頁仍能正常顯示為驗證。
- [x] 2.2 依 `Model display-page component editing with a shared config envelope plus page-specific region descriptors` 接線 `packages/shared/src/displayPageConfig.ts`、`apps/web/src/services/api.ts` 與 editor data loading/saving flow，讓 page id、region ids、dirty/save/error 狀態可被追蹤；以手動儲存、刷新、重進 editor route 後設定仍存在為驗證。

## 3. Overview phase

- [x] 3.1 實作 `Make Overview display page component editing support hero copy, hero media, and KPI cards`：`Overview` 可編輯 slogan 三段、hero image、hero container 與 KPI card geometry；以手動修改並刷新 editor/runtime 為驗證。
- [x] 3.2 依 `Apply persisted page config through prepared display models while preserving playback contracts` 讓正式 `/overview` 套用 persisted config，同時保留 playback shell、offline redirect、route rotation 與 live metrics/fallback；以 `pnpm --filter @solar-display/web test -- src/pages/Overview/*.test.ts src/layouts/offlineRouting.test.ts` 為驗證。

## 4. Solar phase

- [x] 4.1 實作 `Make Solar display page component editing support hero, flow nodes, connectors, and KPI cards`：`Solar` 可編輯 hero、flow nodes、connectors 與 KPI cards；以手動修改 node/connector/card 後 editor 與 runtime 同步為驗證。
- [x] 4.2 依 `Phase the display-page editor rollout by page family rather than implementing all five pages at once` 將 `Solar` phase 保持在 page-local editor work，不重開 foundation redesign；以 `pnpm --filter @solar-display/web test -- src/pages/Solar/*.test.ts src/layouts/offlineRouting.test.ts` 為驗證。

## 5. Factory Circuit phase

- [x] 5.1 實作 `Make Factory Circuit display page component editing support copy, nodes, connectors, and load rows`：`Factory Circuit` 可編輯 title/copy/status、nodes、connectors 與 load rows；以手動調整 load rows 與 connectors 後 editor/runtime 一致為驗證。
- [x] 5.2 依 `Apply persisted page config through prepared display models while preserving playback contracts` 讓正式 `/factory-circuit` 套用 persisted config 而不破壞既有資料呈現；以 `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/*.test.ts src/layouts/offlineRouting.test.ts` 為驗證。

## 6. Images phase

- [x] 6.1 實作 `Make Images display page component editing support the media stage, info panel, thumb grid, and arrows`：`Images` 可編輯 main media stage、info panel、thumb grid 與 arrows；以手動調整 thumb/arrow 位置後 editor/runtime 一致為驗證。
- [x] 6.2 依 `Apply persisted page config through prepared display models while preserving playback contracts` 讓正式 `/images` 套用 persisted config 而不破壞既有 slideshow asset 行為；以 `pnpm --filter @solar-display/web test -- src/pages/Images/*.test.ts src/layouts/offlineRouting.test.ts` 為驗證。

## 7. Sustainability phase

- [x] 7.1 實作 `Make Sustainability display page component editing support hero, KPI or stat cards, and the highlight rail`：`Sustainability` 可編輯 hero、KPI/stat cards 與 highlight rail；以手動調整 hero/card/rail 後 editor/runtime 一致為驗證。
- [x] 7.2 依 `Apply persisted page config through prepared display models while preserving playback contracts` 讓正式 `/sustainability` 套用 persisted config 而不破壞既有 storytelling-number 顯示；以 `pnpm --filter @solar-display/web test -- src/pages/Sustainability/*.test.ts src/layouts/offlineRouting.test.ts` 為驗證。

## 8. 收尾與整體驗證

- [x] 8.1 依 `Support phased display page component editing rollout across all five display pages` 完成五個 page phases 的整體驗證，確認 foundation、page switcher、fallback 與各頁 persisted config 都成立；以 `pnpm --filter @solar-display/web build` 與手動逐頁驗證 editor route 為驗證。
- [x] 8.2 驗證 management route coverage 與 display editor 導航不混入 system settings 語意，符合 `Keep the editor interaction inside a dedicated management route, not the production playback routes`；以手動檢查管理導航與 route coverage 為驗證。
