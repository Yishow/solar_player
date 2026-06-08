## 0. Design / spec traceability

對照 design.md decisions 與 spec requirements，確認 tasks 涵蓋無遺漏：

- Decision「Memoize ImageManagement viewModel and sort once」→ tasks 1.1 / 1.2。
- Decision「Memoize SlideshowPreview viewModel and visibleCards, memo the cards component」→ tasks 2.1 / 2.2。
- Decision「Fold Energy chart traversals into a single pass」→ tasks 3.1 / 3.2。
- Decision「Add native lazy loading and memo to AssetLibrary」→ tasks 4.1 / 4.2。
- Requirement「Management render output unchanged after optimization」→ 全部 task，驗於 5.1 / 5.2。
- Requirement「Energy chart values unchanged after traversal folding」→ tasks 3.1 / 3.2，驗於 5.1。
- Requirement「Management edit, save, and CRUD behavior preserved」→ tasks 1.x / 2.x / 4.x，驗於 5.2。
- Requirement「Existing management tests pass without modification」→ task 5.1。

## 1. ImageManagement

- [x] 1.1 [P] 在 `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx` 把 `buildImageManagementViewModel(...)` 包進 `useMemo`，dependency 為 assets/playlistEntries 等實際輸入。完成標準：打字時 viewModel 僅在輸入變動時重建，畫面與 draft dirty 不變，既有 ImageManagement 測試通過。
- [x] 1.2 [P] 在 `apps/web/src/pages/ImageManagement/viewModel.ts` 讓 `sortAssets` 在單次 `buildImageManagementViewModel` 內只執行一次，排序結果重用於 selected asset 解析。完成標準：viewModel 輸出與優化前位元等價，無重複排序。

## 2. SlideshowPreview

- [x] 2.1 [P] 在 `apps/web/src/pages/SlideshowPreview/index.tsx` 把 `buildSlideshowPreviewViewModel(...)` 與 `visibleCards`（環形索引計算）包進 `useMemo`，並把傳給卡片元件的 `cards` 陣列穩定化。完成標準：rotation 更新時 viewModel/visibleCards 僅在來源變動時重算。
- [x] 2.2 [P] 在 `apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx` 為元件加 `React.memo`。完成標準：rotation 更新只重繪變動卡，輪播行為與現狀一致。

## 3. EnergyTrend / EnergyHistory

- [x] 3.1 [P] 在 `apps/web/src/pages/EnergyTrend/viewModel.ts` 把各 card 的獨立 `snapshots.map`（`buildChartPoints`）與 `sumMetric`/`averageMetric` 合併為對 snapshots 的單次遍歷產出所有 chart vectors 與 sum/avg；維持既有 viewModel `useMemo`。完成標準：相同 snapshots 下輸出數值與曲線逐點等同優化前，既有 EnergyTrend 測試通過。
- [x] 3.2 [P] 在 `apps/web/src/pages/EnergyHistory/viewModel.ts` 把 chartLines 對 snapshots 的多次 map 合併為單次遍歷產出所有 line vectors；維持既有 viewModel `useMemo`。完成標準：相同 snapshots 下輸出數值逐點等同優化前，既有 EnergyHistory 測試通過。

## 4. AssetLibrary

- [x] 4.1 [P] 在 `apps/web/src/pages/AssetLibrary/index.tsx` 為縮圖 `<img>` 加 `loading="lazy"` 與 `decoding="async"`（僅縮圖、不改容器尺寸），並把 `selectedAsset` 以 `useMemo` 包裝。完成標準：縮圖捲入視窗才載入、最終視覺不變，selectedAsset 不每 render 重算。
- [x] 4.2 [P] 在 `apps/web/src/pages/AssetLibrary/index.tsx` 把資產卡抽為 `React.memo` 元件，以穩定 `onSelect`（既有 setter）與 `isSelected` 傳入。完成標準：選取與分類計數行為不變，非選取狀態改變的卡不重繪。

## 5. Verification

- [x] 5.1 執行 `pnpm --filter @solar-display/web test`，驗證 spec requirement「Existing management tests pass without modification」「Management render output unchanged after optimization」「Energy chart values unchanged after traversal folding」：五頁既有測試全綠且未修改既有斷言，Energy viewModel 對相同 snapshots 輸出不變。
- [x] 5.2 以 `agent-browser` 驗證 spec requirement「Management edit, save, and CRUD behavior preserved」：ImageManagement 編輯/儲存/draft dirty；SlideshowPreview rotation；EnergyTrend/EnergyHistory 切 range 圖表逐點；AssetLibrary 選取與縮圖延遲載入。皆與現狀一致。
