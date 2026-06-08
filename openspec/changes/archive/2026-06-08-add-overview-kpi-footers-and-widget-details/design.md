## Context

目前 `/overview` 播放頁面正處於視覺質感收斂階段。為了解決 KPI 卡片頁尾過於單一（僅 Sparkline）與警示通知組件正常時大片留白的問題，本設計旨在提供更多可配置的 Footer 模式與 Widget 狀態切換欄位給 `/display-pages/editor` 編輯器，從而以動態、由 Editor 驅動的方式將 UI 質感推向 `docs/reference/Better/01.Overivew (大).png` 的精緻度。

## Goals / Non-Goals

**Goals:**

* 擴充 `OverviewKpiCardConfig` 與 `OverviewDashboardWidgetConfig`，允許自訂 KPI 卡片頁尾型態（折線圖、進度條與目標、自訂說明文字、植樹棵數換算）與警示通知組件的門檻常駐顯示開關。
* 修改 `Overview/index.tsx` 的卡片渲染與下排 Widget 元件，在 Runtime 正確渲染不同型態的 Footer 與組件樣式，移除原有的硬編碼限制。
* 實現精細化組件排版：包含天氣指標 Flex 橫排排版、發電趨勢漸層面積圖（Area Sparkline）與靜態 Tab。
* 確保歷史 config 升級時有完善的 Fallback 機制，當沒有新欄位時能自動套用 seedConfig 中對齊 Better 設計圖的預設配置。

**Non-Goals:**

* 不改動 `DisplayCardFrame` 共享卡片的核心 HTML DOM 框架與結構；僅在其內部插槽 (Slot) 中自訂渲染。
* 不涉及 Fastify 後端 SQLite 的 schema 調整，也不修改 API payload 外殼；所有擴充欄位皆在既有 display page JSON blob 中儲存與傳遞。
* 不改動其他四個播放頁面（Solar / Factory Circuit / Images / Sustainability）的外觀與編輯器配置。

## Decisions

### 決策一：將 Footer 業務屬性定義於 KPI Card Config 內而非 Card Style
* **說明**：`DisplayCardStyleConfig` 代表純粹的外觀樣式屬性（例如 card padding, radius, font size），而 Footer 的展示類型（如 progress bar, custom text 等）涉及業務邏輯與內容，應定義於每個 KPI 卡片本身的 `kpiCards` config (即 `OverviewKpiCardConfig`) 中。
* **替代方案**：若定義在 `cardStyles` 會導致外觀樣式 schema 混入業務邏輯，且不利於為每張卡片指定特定的內容（如目標發電量、自訂說明字串）。

### 決策二：利用 toggle 欄位控制 Alert Widget 呈現常駐狀態
* **說明**：`AlertNotificationsWidget` 在無 active alert 時應常駐顯示四大門檻規則。我們在 widget config 新增一個 `alwaysShowThresholds` 欄位（Toggle），以便於在 editor 控制其開啟或關閉。
* **替代方案**：若在 page CSS 或 Component 程式碼內硬編碼此常駐狀態，將使使用者失去控制彈性，無法在 editor 中切換回原有的 live alert 列表模式。

### 決策三：在 displayPageConfig 中落實新舊配置相容的 Fallback 邏輯
* **說明**：為了防止歷史持久化資料在載入時因為沒有新欄位而發生 regression，需在 `resolveOverviewModernDefaultConfig` 中，檢測若 config 的 KPI 卡片無 `footerType` 屬性時，自動回退並套用 seedConfig 內對齊 Better 設計圖的預設配置（例如今日發電量預設 progress, 累積發電量預設 text 等）。
* **替代方案**：若不加 fallback 合併，可能導致舊有資料載入時新屬性為 `undefined`，進而造成前端渲染錯誤或空白。

## Implementation Contract

**1. 介面與資料結構 (Data Shape)**
* **`OverviewKpiCardConfig` 擴充**：
  ```typescript
  export type OverviewKpiCardConfig = OverviewDisplayRect & {
    visible: boolean;
    footerType: "sparkline" | "progress" | "text" | "co2-tree" | "none";
    footerText?: string;   // 用於自訂說明文字
    targetValue?: number;  // 用於進度條的目標值 (如 5000)
  };
  ```
* **`OverviewDashboardWidgetConfig` 擴充**：
  在 `dashboardWidgets.alertNotifications` 的配置中擴充 `alwaysShowThresholds?: boolean`。

**2. 行為與 Runtime 渲染 (Runtime Behavior)**
* **KPI Card Footer 渲染**：
  在 `Overview/index.tsx` 遍歷 `overviewCardOrder` 渲染卡片時，讀取 `layout.footerType` (此處 the layout 代表 `resolvedConfig.kpiCards[cardItem.key]`)：
  - `sparkline`: 渲染 `<Sparkline className="overview-kpi-sparkline" values={metric.trendSeries} />`。
  - `progress`: 渲染進度條元件，並計算百分比 `(metric.value / targetValue) * 100`。
  - `text`: 渲染精緻文字，顯示配置的 `footerText`（如 `自建置起 2022 / 01 至今`）。
  - `co2-tree`: 渲染綠色樹葉 icon 與植樹樹木數量（依當前數值換算並顯示，格式為 `相當於種植 ${metric.value} 棵樹`）。
  - `none`: 不渲染頁尾。
* **Alert Notifications Widget 渲染**：
  `AlertNotificationsWidget.tsx` 接收 `alwaysShowThresholds` 參數。當其為 `true` 時，即使 live alerts 陣列為空，仍常駐顯示四大規則的監控門檻列表（即時功率、逆變器溫度、電網電壓、通訊中斷）與綠色「正常」標記。
* **Weather Widget 渲染**：
  `WeatherCardWidget.tsx` 內將濕度、風速、雨量三個小指標改為 Flex 橫排（`flex-direction: row; justify-content: space-between`），並套用更精確的間距。
* **Generation Trend Widget 渲染**：
  `GenerationTrendWidget.tsx` 內將 Sparkline 折線下方填滿漸層，並在頂部模擬 `Today / 7D / 30D` 與更新選單靜態項目。

**3. 驗收標準 (Acceptance Criteria)**
* 所有 React 測試 `pnpm --filter @solar-display/web test` 必須全綠通過。
* 在 `/display-pages/editor?page=overview` 中，選中 KPI 卡片時，Inspector 面板需出現「頁尾類型」下拉選單，並在選中「進度條」或「自訂說明文字」時，動態展開對應的「發電目標」與「自訂說明文字」輸入框。
* 在 Editor 中修改 Footer 類型或啟用 Alert 門檻常駐並存為 draft 後，Overview 頁面 draft 預覽能正確即時反映 Better 設計圖的視覺佈局。

## Risks / Trade-offs

* **[Risk]** ➡️ 歷史持久化 config 載入時缺少 `footerType` 導致屬性為空。
* **[Mitigation]** ➡️ 在 `resolveOverviewModernDefaultConfig` 中，對每個 KPI 卡片與 Widget 屬性進行防禦性合併，若 `footerType` 或 `alwaysShowThresholds` 為空，一律套用 seedConfig 中的 Better 預設值。
