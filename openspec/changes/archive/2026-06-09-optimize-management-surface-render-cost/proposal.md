## Summary

降低 ImageManagement、SlideshowPreview、EnergyTrend、EnergyHistory、AssetLibrary 五個管理頁的 render 成本：為缺 memo 的 viewModel 加 `useMemo`、列表卡片加 `React.memo`、縮圖加原生 lazy loading、把多次重複的 snapshots 遍歷合併為單次 pass，使打字、rotation、socket 更新與大量資產不再觸發整頁重算與全列重繪，且不改畫面輸出與既有 CRUD/儲存行為。

## Motivation

五頁各有獨立的重算或載入成本：

- **ImageManagement**：`apps/web/src/pages/ImageManagement/ImageManagementContent.tsx` 在 component body 直接呼叫 `buildImageManagementViewModel(...)`，無 `useMemo`；使用者打字（title/description）觸發 `setAssets`（整陣列 map 重建）→ viewModel 完整重建（含 `sortAssets`、slideshow filter、library map、`buildReferenceTriageGroups`）並觸發含 `JSON.stringify` 的 draft diff。`apps/web/src/pages/ImageManagement/viewModel.ts` 在單次 viewModel 計算內重複呼叫 `sortAssets` 兩次。
- **SlideshowPreview**：`apps/web/src/pages/SlideshowPreview/index.tsx` 的 `buildSlideshowPreviewViewModel(...)` 與 `visibleCards.map(...)` 在 render body 無 `useMemo`；`apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx` 無 `React.memo`，rotation 每數秒更新即整組預覽卡重繪。
- **EnergyTrend / EnergyHistory**：兩頁 viewModel 已正確 `useMemo`，但 `EnergyTrend/viewModel.ts` 的 `buildChartPoints` 對每張 card 各做一次 `snapshots.map`（5 張＝5 次遍歷），`sumMetric`/`averageMetric` 再各做 map+filter+reduce；`EnergyHistory/viewModel.ts` 的 chartLines 對 snapshots 做 3 次 map。year/total range 下 snapshots 可達數百筆，重複遍歷成本顯著。
- **AssetLibrary**：`apps/web/src/pages/AssetLibrary/index.tsx` 的縮圖 `<img>`（行內含 `previewSrc`）無 `loading="lazy"`/`decoding="async"`，資產多時一次全載；`selectedAsset` 以 `filteredAssets.find(...)` 在 render body 計算無 `useMemo`；資產卡無 `React.memo`。

五頁皆為 management surface，本 change 保留其 API、draft、CRUD/儲存行為與畫面輸出。

## Proposed Solution

1. **ImageManagement**：把 `buildImageManagementViewModel(...)` 包進 `useMemo`（dependency 為 assets/playlistEntries 等實際輸入），並在 viewModel 內讓 `sortAssets` 只執行一次（排序結果重用）。
2. **SlideshowPreview**：把 `buildSlideshowPreviewViewModel(...)` 與 `visibleCards` 計算包進 `useMemo`，為 `LiveSlideshowPreviewCards` 加 `React.memo`，使 rotation 更新只重繪變動卡。
3. **EnergyTrend / EnergyHistory**：把對 snapshots 的多次獨立 map/aggregate 合併為單次遍歷產出所有 chart vectors 與 sum/avg，維持既有 viewModel `useMemo`。
4. **AssetLibrary**：縮圖 `<img>` 加 `loading="lazy"` 與 `decoding="async"`；`selectedAsset` 包進 `useMemo`；資產卡抽為 `React.memo` 元件並以穩定 `onSelect` 傳入。

驗證以五頁既有 web tests 全綠為基準（不得修改既有斷言），並以 `agent-browser` 確認 ImageManagement 編輯/儲存/draft dirty、SlideshowPreview rotation、Energy 圖表切 range、AssetLibrary 選取與縮圖載入行為與現狀一致。

## Non-Goals

- 不改五頁的 API、draft/儲存契約或資料模型。
- 不改畫面輸出（DOM/style/文字、圖表數值與曲線不變）。
- 不引入虛擬化（windowing）函式庫；AssetLibrary 僅做原生 lazy loading，不導入 react-window（保留為未來評估）。
- 不處理 playback 五頁、editor、settings 頁（各自獨立 change）。

## Alternatives Considered

- **ImageManagement 用 `useDeferredValue` 取代 viewModel `useMemo`**：能讓打字不阻塞，但無法消除每次重建的根因；先以 `useMemo` + 單次排序處理，deferred 保留為後續可選。
- **AssetLibrary 導入虛擬化**：對極大量資產最有效，但屬較大改動且改變 DOM 結構（與零畫面變動衝突）；本批先做 lazy loading 與 memo，虛擬化另案評估。

## Capabilities

### New Capabilities

- `management-surface-render-invariance`: 釘住「management 頁 render 效能優化必須維持畫面與行為不變」的契約——memoization、卡片 memo、lazy loading 與遍歷合併不得改變 DOM/style/文字輸出與圖表數值，且編輯/儲存/draft/CRUD/選取行為與既有一致；以既有 web tests 與瀏覽器 witness 為驗證門檻。

### Modified Capabilities

(none)

## Impact

- Affected specs: `management-surface-render-invariance`（新增；描述 management 效能優化的零行為變動契約）。
- Affected code:
  - Modified:
    - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
    - apps/web/src/pages/ImageManagement/viewModel.ts
    - apps/web/src/pages/SlideshowPreview/index.tsx
    - apps/web/src/pages/SlideshowPreview/LiveSlideshowPreviewCards.tsx
    - apps/web/src/pages/EnergyTrend/viewModel.ts
    - apps/web/src/pages/EnergyHistory/viewModel.ts
    - apps/web/src/pages/AssetLibrary/index.tsx
  - New: 無
  - Removed: 無
