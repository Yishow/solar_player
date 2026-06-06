## Context

Overview 現為 Hero + 5 張 KPI 卡片的寬鬆展示頁，KPI 卡片各註冊為可編輯 region 並有 runtime `trendSeries`。Better 意圖參考在下方加了發電趨勢、警示通知、三相電力等 widget。本設計只處理有真實資料源的兩個 widget：發電趨勢（`GET /api/metrics/history`、Overview runtime `trendSeries`）與警示通知（`displayStoryService` 的 alertTone/fallbackReason、device readiness findings）。三相電力無 per-phase 資料源，排除。

前置能力 `extend-display-card-visibility-and-aspect-lock` 提供 per-card `visible` toggle 與等比例縮放；本 change 依賴其顯示/隱藏能力，widget 預設隱藏、按需啟用。

## Goals / Non-Goals

**Goals:**

- Overview 新增「發電趨勢」與「警示通知」兩個 widget card，資料皆來自既有 runtime 來源，不使用 mock。
- 兩 widget 各為可編輯 region（geometry + 顯示/隱藏 toggle），seed 預設 `visible: false`。
- operator 可在 editor 啟用、用既有 canvas 工具定位，並經既有 draft/live 發布上牆。

**Non-Goals:**

- 不新增三相電力（R/S/T）widget，也不新增其資料源；待獨立資料層 change。
- 不自動重排版面：啟用 widget 後的 KPI/widget 位置由 operator 用既有 canvas 工具調整，本次不做 auto-reflow。
- 不改 shared header/footer、不改底部導覽。
- 不重做拖曳、吸附、版面安全、draft/live、顯示/隱藏等既有能力。

## Decisions

### 發電趨勢 widget 綁定既有 metrics history 與 runtime trendSeries

發電趨勢 widget 從既有 `GET /api/metrics/history`／Overview runtime view model 的趨勢資料渲染，沿用 Overview 既有 `trendSeries` 取得管線，無 runtime 資料時顯示空狀態而非 mock。
- 替代方案：新增專用 trend 端點。否決：既有 metrics history 已提供時間序列，重用即可。

### 警示通知 widget 綁定既有警示來源

警示通知 widget 從既有警示來源（`displayStoryService` 的 alertTone/fallbackReason、device readiness findings）取近期警示列表渲染，無警示時顯示「無警示」空狀態，不使用 mock。
- 替代方案：新增警示 store。否決：既有 story/readiness 已產生警示語意，重用即可。

### 兩 widget 註冊為預設隱藏的可編輯 region

每個 widget 在 Overview displayPageConfig 各加一個 region（geometry 路徑、顯示/隱藏 toggle 欄位），seed `visible: false`。runtime 依 `visible` 旗標（`visible !== false` 視為顯示）render。重用前置 change 的顯示/隱藏與等比例縮放能力，不另建 persistence。
- 替代方案：預設顯示。否決：平時要維持 FHD 乾淨版面，且需求是「按需上牆」。

## Implementation Contract

**行為：**
- 啟用發電趨勢 widget 並發布後，Overview playback 出現一張依 runtime 趨勢資料渲染的發電趨勢 widget；無趨勢資料時顯示空狀態。
- 啟用警示通知 widget 並發布後，Overview playback 出現一張列出近期警示（來自既有警示來源）的 widget；無警示時顯示空狀態。
- 兩 widget 預設 `visible: false`，未啟用時不出現於 playback；在 editor 可選取、定位、切換顯示。

**介面／資料形狀：**
- Overview view model 暴露發電趨勢序列（重用既有 `trendSeries` 取得方式）與警示項目列表（來源欄位含警示語意與 reason）。
- `OverviewDisplayPageConfig` 新增兩個 widget region 的 geometry 與 `visible` 設定；seed 兩者 `visible: false`。
- 兩 widget 各對應一個 `overview-widget-*` editable region（geometry 路徑 + 顯示/隱藏 toggle 欄位）。

**失敗模式：**
- runtime 無趨勢／無警示資料時，widget 顯示空狀態，不渲染 mock、不拋錯。
- 既有 Overview draft 無 widget 設定時，視為兩 widget 皆隱藏，不影響現有 render。

**驗收標準：**
- apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx：發電趨勢 widget 以 runtime 趨勢資料渲染、無資料顯示空狀態；警示通知 widget 以既有警示來源渲染、無警示顯示空狀態；兩者 `visible:false` 時不出現。
- Overview seed/config 測試：兩 widget region 存在、`visible` 預設 false、含顯示/隱藏 toggle 欄位。
- `pnpm --filter @solar-display/web test` 綠；`pnpm run build` exit 0。

**範圍邊界：**
- 僅 Overview 兩個 widget（發電趨勢、警示通知）、其 viewModel 資料暴露、config region 與 tests。
- 不含三相電力 widget／資料源、auto-reflow、導覽圖示、其他頁面。

## Risks / Trade-offs

- [既有警示來源語意未必完全對應 Better 的警示清單樣式] → 以既有 alertTone/reason／readiness findings 為準渲染，視覺貼近 reference 但不發明新欄位；差距記為後續 polish。
- [widget 啟用後與 KPI 版面重疊] → 由 operator 用既有 canvas 工具定位，版面安全驗證仍會在發布時擋下出血／重疊；本次不做 auto-reflow。
- [依賴前置 change 尚未實作] → 本 change 須在 `extend-display-card-visibility-and-aspect-lock` 之後實作；apply 前確認前置能力已就緒。
