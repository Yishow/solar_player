## 1. 擴充 Configuration 與 Schema

- [x] 1.1 擴充 `OverviewKpiCardConfig` 與 `OverviewDashboardWidgetConfig` 的屬性型別（包含 `footerType`、`footerText`、`targetValue` 與 `alwaysShowThresholds`）。落實「決策一：將 Footer 業務屬性定義於 KPI Card Config 內而非 Card Style」。驗證：執行 `pnpm run build:shared` 與 `pnpm run build:web` 通過。
- [x] 1.2 在 `apps/web/src/pages/Overview/displayPageConfig.ts` 中，為 5 張 KPI 卡片與 `alertNotifications` widget 配置符合 Better 設計圖的 seed 預設值（`today` 為 progress 目標 5000, `total` 為 text 說明, `co2Today`/`co2Total` 為 co2-tree 換算，且 `alwaysShowThresholds` 預設為 true）。落實「決策三：在 displayPageConfig 中落實新舊配置相容的 Fallback 邏輯」與「Requirement: Author Overview KPI Card Footer Types」的 fallback 契約。驗證：新增 `apps/web/src/pages/Overview/displayPageConfig.test.ts` 的單元測試以驗證歷史 config 合併時新屬性的 fallback 回退邏輯。
- [x] 1.3 在 `displayPageConfig.ts` 中的 `overviewDisplayPageEditorRegions` 擴充 region schema，為 5 張 KPI 卡片新增頁尾控制項，包含 `footerType`（下拉選單）、`footerText`（文字欄位）與 `targetValue`（數字欄位），並使用 `visibleWhen` 來聯動展示；為 `alertNotifications` widget 補上 `alwaysShowThresholds` toggle 欄位。落實「決策二：利用 toggle 欄位控制 Alert Widget 呈現常駐狀態」與「Requirement: Author Overview Alert Threshold Widget Visibility」中編輯器欄位的控制要求。驗證：執行 `pnpm --filter @solar-display/web test` 驗證 schema 欄位型態解析與 visibleWhen 的條件符合預期。

## 2. 實作 Runtime 頁面元件渲染

- [x] 2.1 修改 `apps/web/src/pages/Overview/index.tsx` 的卡片頁尾渲染邏輯，依 `footerType` 條件分支渲染折線圖、進度條元件、自訂小字、或小樹/綠葉換算。落實「Requirement: Author Overview KPI Card Footer Types」的 runtime 多樣化渲染。驗證：在 `apps/web/src/pages/Overview/render.test.ts` 中新增測試案例，模擬不同的 `footerType` 配置，斷言 runtime 能正確渲染進度條百分比、自訂說明文字與種植樹木字串。
- [x] 2.2 修改 `AlertNotificationsWidget.tsx`：當 `alwaysShowThresholds` 開關啟用時，即使當前 alerts 陣列為空，仍常駐顯示四個核心規則的監控門檻狀態（即時功率過高、逆變器溫度過高、電網電壓異常、通訊中斷）與綠色勾勾。落實「Requirement: Author Overview Alert Threshold Widget Visibility」與「決策二：利用 toggle 欄位控制 Alert Widget 呈現常駐狀態」的常駐規則展示。驗證：新增 `AlertNotificationsWidget.test.tsx` 單元測試，斷言在 alerts 為空但 `alwaysShowThresholds` 為真時，核心四行監控規則標記能正確出現在 DOM 中，無「無警示」空狀態。
- [x] 2.3 修改 `WeatherCardWidget.tsx` 的 Flex 佈局使小指標橫排，並調整 `GenerationTrendWidget.tsx` 渲染面積圖與頂部的靜態 Tab 切換選單。落實「Requirement: Refine Lower Dashboard Widgets Appearance」。驗證：執行 `overviewWidgets.test.tsx` 驗證天氣與趨勢組件正常被渲染，並通過程式碼檢視確認 DOM 與樣式。

## 3. CSS 質感打磨與手動驗證

- [ ] 3.1 在 `apps/web/src/pages/Overview/overview.css` 優化卡片的 frosted-glass 毛玻璃效果（更高透光的背景色 `rgba(255, 255, 255, 0.75)`、細白邊框與更輕的灰色陰影），並擴大背景大圖左側的淡出漸層。驗證：手動在瀏覽器開啟 `/display-pages/editor?page=overview`，調整卡片的內部對齊與頁尾類型並儲存 draft，確認預覽頁面即時反映 Better 視覺效果，且沒有其他頁面樣式 regression。
