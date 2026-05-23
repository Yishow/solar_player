## Why

目前系統沒有正式的天氣資料來源，header 只能顯示中性 fallback，無法提供真實戶外天氣。既然使用者已決定採用中央氣象署 OpenData，系統需要先建立可維護的 server 端資料來源、設定持久化與內部契約，後續 header 與管理頁才能安全共用同一份 weather state。

## What Changes

- 新增中央氣象署（CWA）即時觀測資料的 server 端整合，包含授權設定、測站/縣市查詢、欄位正規化與 cache。
- 新增 weather 設定持久化契約，讓系統可儲存 header weather 是否啟用、地點模式、選定縣市/測站、預設組合與自訂欄位。
- 新增內部 weather API，提供管理頁讀寫 weather 設定，並提供 header / 其他前端 surface 可讀取的 current weather contract。
- 定義 CWA 特殊值與資料缺口的 server-side fallback 規則，避免前端直接處理原始異常值。

## Non-Goals

- 本 change 不調整 `AppHeader` 的最終視覺排版與兩行文案組裝。
- 本 change 不重排 `MQTT Settings` 頁面卡片結構或 topic 編輯體驗。
- 本 change 不引入新的第三方天氣 provider，也不讓 web 端直接呼叫 CWA。

## Capabilities

### New Capabilities

- `cwa-weather-source-configuration`: 提供中央氣象署 weather provider、設定持久化、站點/縣市選擇與 current weather 內部 API 契約。

### Modified Capabilities

- `management-display-sync-scoping`: `MQTT Settings` 開始承載 weather 設定後，相關 sync 範圍需要能辨識 weather 設定變更，不可把它當成無關刷新。

## Impact

- Affected specs: `cwa-weather-source-configuration`, `management-display-sync-scoping`
- Affected code:
  - New:
    - `apps/server/src/routes/weather.ts`
    - `apps/server/src/services/weatherService.ts`
    - `apps/server/src/services/cwaWeatherClient.ts`
    - `apps/server/src/services/weatherSettingsService.ts`
    - `apps/server/src/db/migrations/010_weather_settings.sql`
    - `packages/shared/src/weather.ts`
  - Modified:
    - `apps/server/src/app.ts`
    - `apps/server/src/config.ts`
    - `apps/server/src/routes/settings-mqtt.ts`
    - `apps/server/src/routes/settings-mqtt.test.ts`
    - `apps/server/src/services/displayOpsService.ts`
    - `packages/shared/src/index.ts`
    - `.env.example`
  - Removed: (none)
