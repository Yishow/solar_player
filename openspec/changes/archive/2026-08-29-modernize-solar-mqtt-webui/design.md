## Context

現行 `solar_mqtt_go/internal/webui/web` 是一個嵌入在 Go 二進位檔（透過 `go:embed`）中的 Web Console。目前單一檔案過長（`app.js` 959 行、`styles.css` 598 行），且僅呈現未經解析的原始 MQTT Topic 與 Raw JSON。我們需要全面升級為現代化、專業戰情室儀表板，提供雙主題（Dark / Light）、雙版面排列（雙欄 / 分頁）、KPI 卡片與完整的 8 欄位 Zone 表格，並確保單檔不超過 400 行與 Go 測試契約相容性。

## Goals / Non-Goals

**Goals:**
- 提供專業深色科技（Dark Tech）與簡約淺色（Clean Light）主題切換，支援 `localStorage` 與 `prefers-color-scheme`。
- 提供雙欄並排（Split Grid）與單廠分頁標籤（Factory Tabs）兩種版面切換。
- 對齊終端機顯示，直觀呈現 4 大發電 KPI（總功率 kW、今日 MWh、本月 MWh、累積 MWh）。
- 完整呈現 8 大分區欄位（Zone ID、名稱、即時功率 kW、今日發電 kWh、本月發電 MWh、累積發電 MWh、裝置容量 kWp、等效時數 h），支援新 Zone 動態自動新增與排序。
- 保留 MQTT 主題與資料流對照，並提供一鍵複製 `mosquitto_sub` 指令。
- 將 CSS 與 JS 模組化拆分為單檔 < 400 行，並嚴格維持 `webui_test.go` 規定的安全控制與訂閱重設契約。

**Non-Goals:**
- 不更動 Go 後端的 HTTP 路由或 API 格式。
- 不引入外部大型肥重框架（維持純原生 HTML5/CSS3/ES Modules 與輕量 MQTT 函式庫）。
- 不更動後端發布的 MQTT 主題規範與 JSON Payload 格式。

## Decisions

### Decision: Native CSS Design Tokens and Theme Switching
- **方案**：使用 CSS Custom Properties（`--bg-canvas`, `--bg-card`, `--color-primary`, `--color-accent` 等）定義主題，並以 `html[data-theme="dark|light"]` 進行動態切換。
- **理由**：無需額外 CSS preprocessor 或龐大框架，運行效能最佳，並可無縫透過 `localStorage` 記憶使用者偏好。

### Decision: Responsive Layout Modes with Factory Tabs and Split Grid
- **方案**：在頂部工具列提供版面切換按鈕，透過 `main.console-layout[data-layout="split|tabs"]` 控制容器排列方式。在 tabs 模式下提供工廠標籤列（KN / CL），在 split 模式下以雙欄 Grid 並排呈現。
- **理由**：同時滿足寬螢幕戰情室（同時看兩廠）與平板/筆電/單廠深入除錯（聚焦單廠）的使用需求。

### Decision: Reactive 8-Column Zone Grid with Dynamic Key Discovery
- **方案**：前端在 `factory-view.js` 內部針對每個廠區維持 `Map<zone_id, ZoneData>`。當收到 `${prefix}/${factoryId}/zone/${zone_id}` 訊息時，動態更新或新增該 Zone，並依照 `zone_id` 數字升序排序渲染到表格中。
- **理由**：完全解耦分區數量，若現場電廠擴建或新增分區，前端自動同步展現，無需人工修改程式碼。

### Decision: ES Module Modularization Preserving Security Contracts (<400 Lines per File)
- **方案**：將原本肥大的檔案拆分為：
  - CSS: `styles/theme.css`, `styles/layout.css`, `styles/components.css`（各 < 300 行）。
  - JS: `js/app.js` (入口), `js/mqtt-manager.js` (MQTT client & subscription), `js/factory-view.js` (KPI & Zone Grid 渲染), `js/config-view.js` (安全控制與參數表單)（各 < 350 行）。
- **理由**：符合單檔不超過 400 行架構規範，並確保保留 `webui_test.go` 所需的所有 token 與安全防護字串（如 `cmd/get-config`, `controlEnvelope`, 密碼欄位防儲存屬性等）。

## Implementation Contract

- **前端行為**：開啟頁面後，儀表板依照目前連線狀態顯示 KN 與 CL 即時發電數據；頂部可切換主題與版面；分區表格呈現完整 8 欄位；收到新 Zone 自動新增列。
- **介面與資料格式**：
  - 訂閱頻道維持 `${prefix}/${factoryId}/summary`、`${prefix}/${factoryId}/zone/#` 等標準主題。
  - 控制頻道維持 hardened control contract (`cmd/get-config`, `cmd/set`, `state/config`, `state/control-result`)。
- **驗證指標**：
  - 執行 `go test -v ./internal/webui` 必須 100% 通過。
  - 所有新增與修改的 JS/CSS/HTML 檔案單檔均不超過 400 行。
- **範圍邊界**：僅調整 `solar_mqtt_go/internal/webui/web` 前端靜態資產，不修改後端 Go 核心邏輯。

## Risks / Trade-offs

- [Risk: ES Modules 檔案路徑與瀏覽器支援] → Mitigation: 使用標準 `<script type="module" src="js/app.js">`，所有現代瀏覽器均原生支援；Go loopback 靜態檔案伺服器已支援子目錄遞迴提供。
- [Risk: 檔案拆分可能遺漏 webui_test.go 所要求的特定字串標記] → Mitigation: 在拆分過程中精確定位所有測試 assertion 字串，並在每次修改後立即執行 `go test ./internal/webui` 驗證。
