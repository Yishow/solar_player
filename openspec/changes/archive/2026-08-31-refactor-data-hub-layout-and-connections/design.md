## Context

Data Hub 是 Solar Player 管理端的核心資料中樞，承載多廠區（中壢 CL、觀音 KN、全域 Global）的連線設定、資料來源、指標定義、計算設定、使用情形、診斷與天氣資料。
在先前重構時，`/settings/mqtt` 的子元件與其 CSS (`mqttSettings.css`) 未進行徹底的流動式重構，保留了針對 1920×838 全螢幕畫布的寫死絕對定位（`position: absolute; top: 118px; left: 1340px; width: 1198px;` 等），導致 `Connections` 與 `Operations` 子頁面與外層 `PageScaffold` 產生嚴重的佈局崩壞與座標重疊，並衍生出多層重複標題與超長原始碼檔案（超過 800-900 行）。

## Goals / Non-Goals

**Goals:**
- 將 Data Hub 所有子頁面統一至現代流動式響應式設計系統（Fluid Grid / Flexbox），徹底清除所有絕對定位座標。
- 重構 `Connections` 頁面為自適應雙欄佈局：左欄為 Broker 連線表單與模式切換，右欄為即時狀態健康度、測試回饋與維運捷徑。
- 統一頁面視覺層級：由外層 `PageScaffold` 統一呈現標題與導覽，子頁面移除重複標題，對齊邊距與風格。
- 模組化重構 Topic Mappings 與卡片覆寫維運介面，移除固定寬高限制。
- 拆分巨型模組，確保所有新元件與重構後檔案均在 400 行限制內。
- 保持所有後端 API 呼叫、狀態同步（Socket/Live Metrics）、驗證與測試契約 100% 通過。

**Non-Goals:**
- 不變更後端 Fastify API 結構與資料庫 Schema。
- 不變更 Playback 前端播放畫面的渲染契約。
- 不變更 `/settings/mqtt` 現有的相容性轉址邏輯。

## Decisions

### 廢棄舊版寫死絕對定位與引入流動式雙欄佈局
- **決策**：徹底清理 `mqttSettings.css` 中的 `position: absolute`、`top: 118px`、`left: 1340px`、`width: 1198px`，改採 CSS Grid 雙欄佈局（大螢幕 `grid-template-columns: 1.2fr 0.8fr` 或 `repeat(auto-fit, minmax(360px, 1fr))`）。
- **考量替代方案**：保留舊樣式並透過負 Margin 修正，但容易在不同解析度與視窗寬度下再次破版，因此必須徹底拔除寫死座標。

### 精簡頁面標題層級與統一操作列
- **決策**：Data Hub 外層 `PageScaffold` 提供大標題「資料中樞 (Data Hub)」與分頁 Tabs；各子頁面內部不再渲染獨立的 `<section className="mgmt-page-title">` 或重複的 `<h2>資料來源</h2>`，改將分頁特定的動作（例如「測試連線」、「儲存設定」、「重新整理」）置於頂部操作列（Action Bar）。
- **考量替代方案**：保留子標題但縮小字級，但仍會形成三重標題干擾使用體驗，直接去重最符合 KISS 原則。

### 模組化拆分巨型元件至 400 行以內
- **決策**：
  - 連線相關拆分為：`ConnectionsView.tsx`（主頁視圖與操作列）、`BrokerForm.tsx`（表單與模式切換）、`ConnectionStatusCard.tsx`（狀態燈號與測試回饋）。
  - 維運相關拆分為：`TopicOperationsView.tsx`（Topic 映射維運）與 `CardDataOperationsView.tsx`（卡片展示覆寫維運）。
- **考量替代方案**：集中在單一檔案內，但難以維護且違反專案開發規範。

## Implementation Contract

- **使用者可見行為**：
  - 操作者進入 `/settings/data-hub/connections` 時，看到乾淨俐落的雙欄連線介面，無任何標題重疊或漂移到螢幕外的按鈕。
  - 點擊「測試連線」即時顯示連線測試狀態與診斷訊息；點擊「儲存設定」能順利儲存 Broker 配置。
  - 進入 `/settings/data-hub/sources` 或其 operations 子頁時，Topic 清單與卡片覆寫介面呈現自適應流動表格。
- **介面與資料型別契約**：
  - 沿用既有的 `MqttSettingsForm`、`MqttStatus`、`TopicMapping`、`DisplayCardDataRow` 等 TypeScript 型別。
  - API 路由保證相容：`GET/PUT /api/settings/mqtt`、`POST /api/settings/mqtt/test`、`GET/PUT /api/settings/mqtt/topics`。
- **驗證與驗收標準**：
  - 執行 `pnpm --filter @solar-display/web test` 全數通過。
  - 執行 `pnpm verify` 全量通過無 regression。
  - 檢查所有新創立與修改後的前端檔案，行數均在 400 行以內。

## Risks / Trade-offs

- **[Risk] 舊版測試案例可能依賴特定 CSS class 名稱或 DOM 結構選擇器** → **Mitigation**: 保持關鍵 `data-testid`、`data-mqtt-section`、`role="tab"` 等語意化屬性不變，並更新過時的 class 選擇器斷言。
- **[Risk] 狀態同步（live metrics 與 MQTT status）在拆分元件後可能傳遞不及** → **Mitigation**: 保留頂層 hook 與 view model 的資料流，透過 props 顯式傳遞至純呈現子元件。
