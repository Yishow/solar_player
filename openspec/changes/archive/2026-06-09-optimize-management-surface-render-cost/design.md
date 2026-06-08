## Context

五個管理頁的重算/載入成本來源各異：ImageManagement 的 `ImageManagementContent.tsx` 的 `buildImageManagementViewModel` 無 `useMemo`，打字觸發 `setAssets` 整陣列 map 重建 → viewModel 全量重算 + `JSON.stringify` draft diff，且 `viewModel.ts` 內 `sortAssets` 被呼叫兩次；SlideshowPreview 的 `buildSlideshowPreviewViewModel` 與 `visibleCards` 在 render body 無 memo，`LiveSlideshowPreviewCards` 無 `React.memo`；EnergyTrend/EnergyHistory 的 viewModel 已 `useMemo`，但對 snapshots 做多次獨立 map/aggregate；AssetLibrary 縮圖無 lazy loading、`selectedAsset` 無 memo、資產卡無 memo。五頁皆為 management surface，須保留 API/draft/CRUD/儲存行為與畫面輸出。

## Goals / Non-Goals

**Goals:**

- 為缺 memo 的 viewModel（ImageManagement、SlideshowPreview）加 `useMemo`；EnergyTrend/EnergyHistory 維持既有 viewModel memo。
- 列表卡片 memo 化、縮圖 lazy loading、重複 snapshots 遍歷合併為單次 pass。
- 畫面輸出（含圖表數值與曲線）與編輯/儲存/draft/CRUD/選取行為零變動。

**Non-Goals:**

- 不改 API、draft/儲存契約、資料模型。
- 不改畫面輸出。
- 不導入虛擬化函式庫。
- 不處理 playback 五頁、editor、settings。

## Decisions

### Memoize ImageManagement viewModel and sort once

把 `buildImageManagementViewModel(...)` 包進 `useMemo`（dependency 為 assets/playlistEntries 等實際輸入），並在 `viewModel.ts` 內讓 `sortAssets` 只執行一次、其結果重用於 selected asset 解析。理由：打字觸發整陣列重建與 viewModel 全量重算（含兩次排序與 `JSON.stringify`）是主成本；memo + 單次排序降低每 keypress 開銷。畫面輸出與 draft dirty 結果不變。

### Memoize SlideshowPreview viewModel and visibleCards, memo the cards component

把 `buildSlideshowPreviewViewModel(...)` 與 `visibleCards`（環形索引計算）包進 `useMemo`，為 `LiveSlideshowPreviewCards` 加 `React.memo` 並穩定其 `cards` prop。理由：rotation 每數秒更新即整組預覽卡重繪；memo 使僅變動卡重繪。

### Fold Energy chart traversals into a single pass

把 EnergyTrend `buildChartPoints` 對每張 card 的獨立 `snapshots.map` 與 `sumMetric`/`averageMetric`，以及 EnergyHistory chartLines 的多次 map，合併為對 snapshots 的單次遍歷產出所有 chart vectors 與 sum/avg。維持既有 viewModel `useMemo`。理由：year/total range 下 snapshots 數百筆，5 次遍歷可降為 1 次；輸出數值與曲線不變。

### Add native lazy loading and memo to AssetLibrary

縮圖 `<img>` 加 `loading="lazy"` 與 `decoding="async"`；`selectedAsset` 以 `useMemo` 包裝；資產卡抽為 `React.memo` 元件，以穩定 `onSelect`（既有 setter）傳入。理由：資產多時一次全載與全卡重繪是主成本；lazy + memo 降低初始載入與重繪，DOM 結構不變（僅 img 屬性新增）。不導入虛擬化以維持 DOM 結構與零畫面變動。

## Implementation Contract

**Behavior（對使用者而言）：** 五頁畫面與資料一致。ImageManagement：編輯 title/description、儲存、draft dirty 標示、playlist 與 reference triage 行為不變。SlideshowPreview：rotation 預覽如常輪播。EnergyTrend/EnergyHistory：切換 range 後圖表的數值、曲線、空狀態與優化前逐點相同。AssetLibrary：選取資產、分類計數、縮圖最終顯示與現狀一致；縮圖改為延遲載入（捲動進視窗才載），最終視覺不變。

**Interface / data shape：** 不新增或變更 API、draft/儲存契約、資料模型。`buildImageManagementViewModel` / `buildSlideshowPreviewViewModel` / `buildEnergyTrendViewModel` / `buildEnergyHistoryViewModel` 的輸入與回傳 shape 不變；Energy 兩者的 chart vector/sum/avg 數值輸出與優化前相等。`LiveSlideshowPreviewCards` 與抽出的 AssetLibrary 卡片 props 介面語意不變，僅以 `React.memo` 包裝。AssetLibrary 縮圖 `<img>` 僅新增 `loading`/`decoding` 屬性。

**Failure modes：** viewModel memo dependency 漏列 → 表現為「編輯後畫面/儲存資料未更新」，由既有測試與瀏覽器 witness 捕捉。Energy 遍歷合併若改動取值順序或 null 處理 → 圖表數值偏差，以既有 EnergyTrend/EnergyHistory viewModel 測試與逐點對照把關。AssetLibrary lazy loading 若套到非縮圖或改 DOM → 視覺變動，以 witness 對照。memo dependency 多列最壞退化為現狀，正確性不受影響。

**Acceptance criteria：**

- `pnpm --filter @solar-display/web test` 全綠；五頁既有測試（含 ImageManagement、EnergyTrend、EnergyHistory、SlideshowPreview 相關）不需修改即通過。Energy viewModel 測試對相同 snapshots 的輸出數值不變。
- 以 `agent-browser` 驗證：ImageManagement 編輯/儲存/draft dirty；SlideshowPreview rotation；EnergyTrend/EnergyHistory 切 range 圖表；AssetLibrary 選取與縮圖延遲載入——皆與現狀一致。

**Scope boundaries：**

- In scope：上述七個既有檔案的 viewModel memo、卡片 memo、Energy 遍歷合併、AssetLibrary lazy loading 與 selectedAsset memo。
- Out of scope：API/draft/儲存契約、資料模型、虛擬化、其他頁面、任何畫面或圖表數值調整。

## Risks / Trade-offs

- [Energy 遍歷合併改變數值或 null 處理] → 以既有 viewModel 測試與相同 snapshots 的逐點數值對照驗證，輸出相等為門檻。
- [ImageManagement viewModel memo dependency 漏列導致編輯後 stale] → 以既有測試與 witness（實際編輯/儲存）驗證。
- [AssetLibrary lazy loading 造成捲動時縮圖閃爍或佔位高度變動] → 確認套用範圍僅縮圖 img、不改容器尺寸；witness 對照捲動行為。
- [SlideshowPreview cards memo 後 `cards` prop 每次新建陣列使 memo 失效] → 連同 `visibleCards`/cards 陣列以 `useMemo` 穩定化，否則僅效益打折、正確性不受影響。
