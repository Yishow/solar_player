## Why

現行 `solar_mqtt_go/internal/webui/web` 僅呈現未格式化的原始 MQTT Topic 字串與未解析的 Raw JSON，缺乏直觀的發電量指標與結構化分區數據，無法提供如終端機（Terminal）一樣清晰完整的即時監控資訊。需要全面美化與現代化 Web Console，提供專業戰情室質感、靈活的版面與主題切換，並完整展現所有發電與分區欄位。

## What Changes

- **雙視覺主題切換**：支援 🌙 深色科技戰情室 (Dark Tech) 與 ☀️ 現代簡約明亮 (Clean Light) 主題，並具備 `localStorage` 偏好記憶。
- **雙版面排列切換**：支援 ⊞ 雙欄並排 (Split Grid) 與 ◫ 分頁標籤 (Factory Tabs) 佈局模式切換，適應寬螢幕監控與單廠聚焦檢視。
- **即時發電摘要卡片 (KPI Cards)**：對齊終端機顯示，直觀呈現總即時功率 (kW)、今日發電 (MWh)、本月發電 (MWh) 與歷史累積 (MWh)。
- **全欄位分區數據表格 (Full Zone Grid)**：完整呈現 8 大欄位（Zone ID、名稱、即時功率 kW、今日發電 kWh、本月發電 MWh、歷史累積 MWh、裝置容量 kWp、等效時數 h），且在新 Zone 發布時前端自動新增列。
- **MQTT 主題與資料流對照**：對齊 Terminal 的發布/訂閱主題對照清單，並附帶一鍵複製快速訂閱指令（`mosquitto_sub`）。
- **模組化架構拆分**：將單檔過長的 `app.js` 與 `styles.css` 依單檔不超過 400 行原則拆分為語意化模組，並維持既有安全控制契約與 Go 單元測試通過。

## Capabilities

### New Capabilities

- `solar-mqtt-webui-dashboard`: 提供專業現代化、支援雙主題與雙版面切換、全欄位分區監控與自動新增的 Solar MQTT 網頁儀表板。

### Modified Capabilities

(none)

## Impact

- Affected specs: `specs/solar-mqtt-webui-dashboard/spec.md`
- Affected code:
  - Modified: `solar_mqtt_go/internal/webui/web/index.html`
  - Modified: `solar_mqtt_go/internal/webui/web/styles.css`
  - Modified: `solar_mqtt_go/internal/webui/web/js/app.js`
  - New: `solar_mqtt_go/internal/webui/web/styles/theme.css`
  - New: `solar_mqtt_go/internal/webui/web/styles/layout.css`
  - New: `solar_mqtt_go/internal/webui/web/styles/components.css`
  - New: `solar_mqtt_go/internal/webui/web/js/mqtt-manager.js`
  - New: `solar_mqtt_go/internal/webui/web/js/factory-view.js`
  - New: `solar_mqtt_go/internal/webui/web/js/config-view.js`
