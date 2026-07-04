## Context

當前系統在前端播放器（Header / Overview）載入時，後端會直接向中央氣象署 (CWA) API 取得最新的天氣數據。然而目前缺乏定時更新與快取機制。當有多台 Raspberry Pi 5 部署在同一個場區且各自連線不同 MQTT Broker 時，頻繁的請求會導致氣象署 Token 被 Rate Limit 封鎖。因此需要實作更新頻率設定、Server 端快取、立即手動更新、過期視覺提示及天氣 MQTT 廣播。

## Goals / Non-Goals

**Goals:**
- 在 SQLite 資料庫的 `weather_settings` 中新增 `update_interval_minutes` 欄位，用以保存天氣更新頻率設定。
- 提供前端選單讓管理員選擇更新頻率（10m, 30m, 1h, 3h, 6h, 12h, manual）。
- 實作後端 `WeatherService` 記憶體快取：當請求 current 天氣時，若快取未過期，直接回傳快取；若過期才向氣象署拉取。
- 提供「立即更新」按鈕，點擊時清除 Server 快取並強制重取。
- 每次成功取得最新天氣數據時，後端自動 publish 該 Snapshot JSON 至本地 MQTT Broker 的 `solar/weather/current` Topic。
- 前端播放器依據設定好的更新頻率自動進行輪詢。
- 當天氣觀測時間超過更新頻率的 2 倍時，在播放端 UI 顯示過期的 Stale 狀態提示。

**Non-Goals:**
- 不使用全域 Cron Job 每天定時打 API，而是採用 Lazy-loaded 隨動式快取：有 client 請求且快取過期時才更新，節省 API 配額與伺服器資源。
- 不修改系統層級的 Mosquitto Bridge 設定。

## Decisions

### Decision 1: Lazy-loaded server cache with clear-on-force
採用 Lazy-loaded 快取。後端 `WeatherService` 在記憶體中維護一個 `cachedSnapshot` 與 `cacheExpiredAt`。當請求 `/api/weather/current` 時，若 `now < cacheExpiredAt`，直接返回快取。
新增 `POST /api/weather/refresh` 路由。點擊前端「立即更新」時，呼叫此 API，後端會清除快取（即將 `cacheExpiredAt` 設為過去時間），強制打氣象署 API 獲取最新資料並重新寫入快取。

### Decision 2: MQTT weather snapshot broadcast
為了解決多設備多 Broker 之間的資料傳遞問題，當 `WeatherService` 成功取得最新 Snapshot 時，會呼叫 `MqttClientService` 將該 Snapshot JSON 發佈到本地 Broker 的 `solar/weather/current` Topic。這樣其他設備（例如另一台 Raspi 5）只需訂閱此 Topic 即可共用氣象，無需設定 API Key。

### Decision 3: Polling in frontend hooks
`useHeaderWeatherMeta` 與 `useOverviewWeather` 將讀取 `WeatherSettings.updateIntervalMinutes`：
- 若值大於 `0` (手動)，則利用 `setInterval` 定期重新呼叫 `refreshWeather()` / `load()`。
- 若值為 `0` (手動)，則僅在掛載 (mount) 時加載一次，不設定定時器。

## Implementation Contract

### 1. Database Schema
- 修改 SQLite 資料表 `weather_settings`（可使用 migration 檔或在 startup 檢查），新增欄位 `update_interval_minutes INTEGER NOT NULL DEFAULT 30`。

### 2. Type definitions
- 共享型別 `WeatherSettings` 新增屬性：
  `updateIntervalMinutes: number;`
- `DEFAULT_WEATHER_SETTINGS` 新增預設值 `updateIntervalMinutes: 30`。

### 3. API Contract
- `GET /api/weather/current`：回傳快取的天氣數據。
- `POST /api/weather/refresh`：清除快取，立即向氣象署拉取最新天氣，寫入快取，並透過 MQTT 發佈。
- `PUT /api/weather/settings`：接收包含 `updateIntervalMinutes` 的設定並儲存。

### 4. MQTT Broker Payload
- 當成功取得天氣時，發佈至：`solar/weather/current`。
- 格式：`JSON` 字串，例如：
  `{"weather":"多雲","airTemperature":31,"relativeHumidity":72,...}`

### 5. Frontend UI
- 在「天氣設定」卡片中新增「更新頻率」`CustomSelect`。
- 新增 `Refresh Now` 按鈕，發送 `POST /api/weather/refresh`，更新 Header Preview。
- 過期視覺提示：若 `now - observationTime > 2 * updateIntervalMinutes`，在 Header 的 secondaryText 顯示為 `資料延遲 (X 小時前)`。

## Risks / Trade-offs

- [Risk] CWA API 回傳失敗時快取該如何處理。
  - **Mitigation**: 若 API 請求失敗，後端回退使用 `lastSuccessfulSnapshot`，將 `fetchState` 設為 `stale`，且延長快取 5 分鐘後再試，避免在故障時頻繁重試打爆氣象局 API。
- [Risk] 兩台 Raspi 5 對同一個 topic `solar/weather/current` 重複 publish 導致無窮迴圈或衝突。
  - **Mitigation**: 只有手動設定了 API Key 且啟用 API 拉取的天氣服務才會對 MQTT 發佈，僅訂閱 Topic 顯示天氣的 client 不會發佈此訊息。
