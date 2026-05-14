## Context

目前 `apps/web/src/pages/Solar/index.tsx` 仍建立在 `PageScaffold` 之上：上半部是 hero + media，下半部是 flow panel 與 KPI cards 的 dashboard/grid 分區；`buildSolarViewModel()` 則同時供應文案、數值與 emoji icon。這種結構雖然保留了 live metrics/fallback，但和 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 的 FHD playback canvas 有明顯落差，特別是 header/footer shell、absolute-position flow diagram、left-bottom hero banner 與 bottom KPI row。

這次 change 的限制也很清楚：只處理 `/solar`，不重寫 backend、不改 socket contract、不把所有頁面都拉進同一套新 shell。設計的重點不是做一個大而全的 UI framework，而是把 `/solar` 對位需要的 shell 邊界、layout contract、asset binding 與 fallback 行為寫成 apply 可直接執行的技術手冊。

## Goals / Non-Goals

**Goals:**

- 讓 `/solar` 脫離管理頁風格的 `PageScaffold` title block，改用 playback-only 的 1920x1080 FHD canvas shell。
- 讓 `/solar` 主要區塊對齊 `02-solar.html`：title group、leaf watermark、gold line、hero photo、4 個 flow nodes、3 條 connectors、5 張 KPI cards。
- 保留 `useLiveMetrics()`、`buildSolarViewModel()`、既有 fallback 行為與 socket data contract。
- 把 layout constants、asset binding 與 icon mapping 集中管理，避免 reference 座標散落在 JSX。

**Non-Goals:**

- 不改 backend API、MQTT、socket payload shape 或 route contract。
- 不把其他頁面一起改成新 FHD canvas，也不全域移除 `PageScaffold`。
- 不在這一輪接入真實 clock/weather API。
- 不要求這一輪達成 1px pixel-perfect，只要求結構、shell、區塊層次與主要資產接近 reference。

## Decisions

### Introduce a playback-only DisplayCanvas shell alongside PageScaffold

決策：新增一個 playback-only 的 FHD canvas shell，例如 `DisplayCanvas`，專門處理 1920x1080 設計座標、viewport scale、header shell、footer nav、page number pill 與 decorative chrome；`PageScaffold` 只保留給既有管理頁與未遷移頁使用。

理由：`PageScaffold` 的核心 contract 是 title/subtitle/description + content stack，它本質上是 management-style layout。若硬把 `/solar` 留在這個骨架裡，再用大量 absolute child 覆蓋，只會留下雙重 shell 與難維護的條件分支。

替代方案：
- 直接擴充 `PageScaffold` 支援 playback variant。拒絕原因：會把 management 與 playback 的結構責任混在同一個元件裡，讓其他頁面承擔不必要複雜度。
- 在 `/solar` 頁內直接手刻整套 header/footer。拒絕原因：缺少可重用的 playback shell primitive，也容易和後續頁面 drift。

### Render solar as absolute-position reference regions instead of dashboard panels

決策：`/solar` 主體改為單一 FHD canvas 內的 absolute-position composition，hero、flow nodes、connectors、KPI cards 都用 reference-aligned 座標區塊佈局，而不是沿用 grid panel + media card 方式。

理由：reference prototype 的主要辨識度來自整張畫布的關係，而不是單一卡片樣式。若保留右側 2x2 flow panel 或圓角 media card，即使換顏色與字型，也仍會是 dashboard，不會像 playback display。

替代方案：
- 保留 grid，僅微調 spacing 與 decoration。拒絕原因：無法滿足這次 prompt 明定的 absolute flow diagram 與 hero banner 位置。
- 直接複製 prototype HTML/CSS。拒絕原因：會把靜態示意結構硬塞進 React，難以和 runtime data/fallback 契合。

### Keep solar reference layout constants and asset bindings page-local

決策：把 `/solar` 的 reference layout constants、asset imports、icon key 對映與 shell mock metadata 集中在 page-local modules，例如 `layout.ts`、page CSS 或等價的頁面專屬設定檔，而不是散落在 JSX literal 中。

理由：這一頁有大量固定座標與資產綁定，後續 visual refinement 幾乎一定還會改。集中管理能讓 apply 階段先把 reference contract 定住，再逐步修細節，而不需要每次在 render tree 找 magic number。

替代方案：
- 所有座標直接寫在 JSX className 或 style。拒絕原因：後續調整成本高，也不利於 reviewer 對照 reference。
- 抽成全域 design token。拒絕原因：這一輪只處理 `/solar`，過早抽象化會把尚未驗證的 page-specific 版面常數誤當成全站 contract。

### Preserve buildSolarViewModel as the runtime data boundary while replacing emoji icons

決策：保留 `useLiveMetrics()` -> `buildSolarViewModel()` -> page render 這個資料邊界；必要時只讓 view-model 改為輸出 `iconKey` 或 page-specific asset identifiers，而不是直接讓 JSX 依賴 emoji 或自行判斷 fallback。

理由：目前 `/solar` 的資料穩定點就在 view-model。若為了換版面而把 fallback 分支、數值格式化、label/helper 決策拆回頁面 component，風險會高於收益。

替代方案：
- 讓頁面 component 直接讀 raw snapshot 並自行決定 icon/fallback。拒絕原因：reference mapping 與資料判斷會糾纏在一起。
- 保留 emoji icon 作為最終 UI。拒絕原因：和 prompt 明確要求衝突，也無法對齊 reference asset system。

## Implementation Contract

**Behavior**

- `/solar` 進入後，主畫面應是帶有 header/footer chrome 的 playback FHD canvas，而不是 `PageScaffold` title block + stacked content。
- 畫面上必須可辨識出 title group、leaf watermark、gold line、hero photo、4 個 flow nodes、3 條 connectors、5 張 KPI cards，且它們的相對位置接近 `02-solar.html`。
- shell 的 clock/date/weather/status 在本輪可使用指定 mock 值，不得因此引入新的 backend 或 weather API 相依。
- KPI 與 flow icons 必須改用 generated PNG asset binding，不再以 emoji 作為最終視覺圖示。

**Interface / data shape**

- `Solar` route 仍透過 `useLiveMetrics()` 取得 `isSocketConnected` 與 `snapshot`，再交給 `buildSolarViewModel()` 準備顯示資料。
- `buildSolarViewModel()` 可調整輸出 shape，以支援 `iconKey`、flow node descriptor、或 page-local asset mapping，但不得改變 live metrics 來源與 fallback 判斷責任歸屬。
- playback-only canvas shell 需接受 `/solar` 所需的 shell chrome 資訊與 children，並在 1920x1080 設計座標上渲染；管理頁不需要採用此元件。

**Failure modes**

- 若 live metrics 缺值或 socket 離線，頁面仍需維持既有 fallback 數值與 helper 文案，且不能因為某個 node/card 無值就破壞整體 FHD composition。
- 若 reference layout constants 或 asset mapping 分散在多處，後續 refinement 很容易出現 drift；因此 apply 階段應把 mapping 收斂到 page-local 設定層。
- 若 shell 仍透過 `PageScaffold` 疊加，會造成雙重 header/title 結構，視為未達成此 change 的 contract。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- 人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`，確認 shell、hero、flow diagram、connector 與 KPI row 的區塊關係已從 dashboard 結構轉成 FHD canvas 結構。
- Code review 可確認 `useLiveMetrics()`、`buildSolarViewModel()`、fallback 行為與 socket contract 仍存在，且頁面不再以 emoji 作為 KPI 最終 icon。

**Scope boundaries**

- In scope：`/solar` route、playback-only FHD canvas shell、page-local layout constants、asset mapping、view-model icon/output 調整。
- Out of scope：其他 route、backend、socket payload、真實 clock/weather integration、pixel-perfect 最終修飾。

## Risks / Trade-offs

- [新增 playback-only shell 可能和既有 shell 形成雙軌] → 將新 shell 邊界限制在 `/solar` 與後續 playback 頁可選用的 primitive，不碰管理頁 contract。
- [absolute layout 在不同 viewport 易失真] → 以固定 1920x1080 設計座標 + viewport scale 實作，不改內部相對位置。
- [view-model 與 asset mapping 若拆分不清，容易回退成 JSX 內大量條件分支] → 保持 `buildSolarViewModel()` 作為資料邊界，page-local mapping 只負責 layout 與 asset lookup。
- [先追求 pixel-perfect 會拖慢結構遷移] → 本 change 只把主要區塊、shell 與資產綁定對齊，細節 refinement 留在後續 follow-up。
