## Why

現場 Pi 連接受限網路時，天氣即時值、縣市與測站選項可能同時取得失敗，但管理頁只呈現一般失敗訊息，無法區分 DNS、連線逾時、TLS、HTTP 回應或資料格式問題。操作人員需要在不登入主機、不接觸 CWA token 的前提下，直接從天氣設定區取得可交付給資訊課與維運人員的錯誤碼、時間與安全摘要。

## What Changes

- 將 CWA current-weather 與 options 請求失敗正規化為穩定且可測試的診斷碼。
- 在受信任的天氣管理 API 契約中提供最近一次請求結果、失敗操作、發生時間、最後成功時間及安全化摘要。
- 在 `/settings/mqtt` 的天氣設定區加入常駐診斷區塊，成功時顯示最近成功狀態，失敗時顯示可複製的錯誤碼與必要上下文。
- 對未設定授權、DNS、連線逾時、請求逾時、TLS、HTTP status、無效 payload 與未知錯誤建立明確顯示規則。
- 維持管理讀取信任邊界，不把診斷細節加入公開播放頁 weather contract。

## Capabilities

### New Capabilities

- `weather-fetch-diagnostics`: 定義 server 端 CWA 錯誤分類、安全化診斷狀態及受信任 API 契約。

### Modified Capabilities

- `mqtt-settings-weather-management`: 在天氣管理區顯示最近成功或失敗診斷，讓操作人員可直接查看與複製錯誤碼。

## Impact

- Affected specs: `weather-fetch-diagnostics`, `mqtt-settings-weather-management`
- Affected code:
  - Modified:
    - apps/server/src/services/cwaWeatherClient.ts
    - apps/server/src/services/weatherService.ts
    - apps/server/src/routes/weather.ts
    - apps/server/src/services/cwaWeatherClient.test.ts
    - apps/server/src/services/weatherService.test.ts
    - apps/server/src/routes/weather.test.ts
    - packages/shared/src/weather.ts
    - apps/web/src/services/api.ts
    - apps/web/src/pages/MqttSettings/index.tsx
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/MqttSettings/viewModel.ts
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
    - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - New: none
  - Removed: none
- API impact: enrich trusted weather management responses with a bounded diagnostic object; public playback weather responses remain unchanged.
- Dependencies: none
