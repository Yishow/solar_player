## Why

在多廠資料管理與維運工作流重整後，原先包山包海的 `/settings/mqtt` 被拆分整併至 Data Hub。然而，目前 `Connections` 與 `Operations` 子頁面仍直接套用舊版寫死寬高與絕對定位的 `mqttSettings.css`，導致畫面產生嚴重的座標重疊、按鈕漂移至畫面外、右側留白不對稱，以及 Data Hub 與子頁面標題三層重複的混亂現象；同時舊版 MQTT 模組檔案嚴重超過 400 行限制。此重構將全面清理絕對定位衝突、統一視覺層級，並落實模組化拆分。

## What Changes

- **全面移除絕對定位衝突**：廢棄 `mqttSettings.css` 舊有的 `position: absolute; top: 118px; left: 1340px; width: 1198px;` 等全螢幕畫布釘死座標，改為標準 Data Hub 流動響應式佈局（Flexbox / Grid）。
- **重構 Connections 連線頁面**：
  - 採雙欄式卡片佈局：左欄為 Broker 設定表單與資料模式切換，右欄為即時連線狀態燈號、診斷資訊與維運快捷入口。
  - 將「測試連線 (Test Connection)」與「儲存設定 (Save Settings)」整合入標準操作列，支援即時回饋與狀態提示。
- **統一 Data Hub 視覺與導覽層級**：
  - 外層 PageScaffold 統一大標題與子分頁 Tab 導覽，各子頁面（Connections, Sources, Metrics, Derived, Usage, Diagnostics, External Data）移除重複的次級標題，保持乾淨簡潔的視覺流。
- **現代化 Sources 維運介面**：
  - 將 `/settings/data-hub/sources/operations` 的 Topic Mappings 與卡片覆寫維運介面改為流動式卡片清單，移除舊版固定尺寸限制。
- **程式碼瘦身與模組化拆分**：
  - 將龐大的 `MqttSettingsContent.tsx` 與 `MqttSettings/index.tsx` 拆分為單一職責小元件（`ConnectionsView`、`BrokerForm`、`ConnectionStatusCard`、`TopicOperationsView`、`CardDataOperationsView`），落實每個檔案不超過 400 行的專案規範。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `data-hub-management-surface`: 統一 Data Hub 頁面層級與流動式佈局，消除絕對定位與標題重複。
- `mqtt-settings-operations-surface`: 將 MQTT 連線與維運操作介面現代化，支援雙欄響應式與模組化架構。

## Impact

- Affected specs:
  - `openspec/specs/data-hub-management-surface/spec.md`
  - `openspec/specs/mqtt-settings-operations-surface/spec.md`
- Affected code:
  - Modified:
    - `apps/web/src/pages/DataHub/index.tsx`
    - `apps/web/src/pages/DataHub/Sources.tsx`
    - `apps/web/src/pages/DataHub/Metrics.tsx`
    - `apps/web/src/pages/DataHub/DerivedMetrics.tsx`
    - `apps/web/src/pages/DataHub/Usage.tsx`
    - `apps/web/src/pages/DataHub/Diagnostics.tsx`
    - `apps/web/src/pages/DataHub/Weather.tsx`
    - `apps/web/src/pages/MqttSettings/index.tsx`
    - `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`
    - `apps/web/src/pages/MqttSettings/mqttSettings.css`
  - New:
    - `apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx`
    - `apps/web/src/pages/DataHub/Connections/BrokerForm.tsx`
    - `apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx`
    - `apps/web/src/pages/DataHub/Sources/TopicOperationsView.tsx`
    - `apps/web/src/pages/DataHub/Sources/CardDataOperationsView.tsx`
