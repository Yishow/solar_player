## Why

當前天氣資訊功能每次被播放器載入或刷新時都會直接打中央氣象署 API 取得數據，前端缺乏定時自動更新機制。在多設備（如兩台 Raspberry Pi 5 且各自連線不同 MQTT Broker）運行的環境下，重複戳氣象署 API 會造成 Token 被頻率限制（Rate Limit）阻擋。因此需要建立更新頻率設定、Server 端快取、立即更新按鈕、過期提示以及天氣 MQTT 廣播機制。

## What Changes

- **新增更新頻率選項**：在天氣設定中加入「更新頻率 (Update Interval)」欄位，包含 `10分鐘`、`30分鐘`（推薦）、`1小時`、`3小時`、`6小時`、`12小時` 及 `手動更新`。
- **Server 端天氣快取**：實作 Server 端快取機制。當前端拉取天氣時，若在快取時間內則直接返回快取資料，避免重複向氣象局發送請求。
- **新增立即手動更新按鈕**：在 MQTT 設定頁面的天氣設定卡片中加入「立即更新 (Refresh Now)」按鈕，供點擊時強行重取氣象署 API 並清除快取。
- **播放端自動輪詢**：使前端播放器（Header 與 Overview）根據設定的更新頻率定時拉取最新天氣資訊。
- **過期視覺提示 (Stale State Display)**：當天氣資料更新時間超過頻率的 2 倍（代表斷網或 API 掛掉）時，前端 UI 顯示 Stale 過期狀態提示。
- **天氣 MQTT 廣播**：後端成功抓取天氣時，自動將氣象 JSON Snapshot 發布到本地的 MQTT Broker，供其他 Raspi 5 設備以 mapping 訂閱。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mqtt-settings-weather-management`: 天氣設定持久化增加更新頻率欄位，新增手動刷新 API 與前端卡片 UI 修改。
- `playback-header-weather-metadata`: 播放端 header 與 overview 增加自動輪詢與過期視覺顯示邏輯。

## Impact

- Affected specs: `mqtt-settings-weather-management`, `playback-header-weather-metadata`
- Affected code:
  - Modified:
    - packages/shared/src/weather.ts
    - apps/server/src/services/weatherService.ts
    - apps/server/src/routes/weather.ts
    - apps/server/src/mqtt/MqttClientService.ts
    - apps/web/src/pages/MqttSettings/index.tsx
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/MqttSettings/viewModel.ts
    - apps/web/src/hooks/useHeaderWeatherMeta.ts
    - apps/web/src/hooks/useOverviewWeather.ts
