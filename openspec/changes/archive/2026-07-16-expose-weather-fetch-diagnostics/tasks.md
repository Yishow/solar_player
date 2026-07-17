## 1. Server 錯誤分類與狀態

- [x] 1.1 [P] 先在 `apps/server/src/services/cwaWeatherClient.test.ts` 建立 `Classify CWA request failures with stable diagnostic codes` 的失敗測試，涵蓋 DNS、connection timeout、request timeout、TLS、HTTP status、invalid payload 與 unknown，並驗證輸出不含 token、完整 URL、hostname、stack 或 raw exception；以直跑該測試檔確認測試在實作前會失敗。
- [x] 1.2 實作「使用穩定的 weather 診斷碼」決策，讓 CWA client 對 current 與 options 產生 bounded typed failure，並以 `apps/server/src/services/cwaWeatherClient.test.ts` 全數通過確認分類與敏感資料 allowlist。
- [x] 1.3 [P] 先在 `apps/server/src/services/weatherService.test.ts` 建立 `Retain the latest bounded weather operation diagnostic` 的失敗測試，涵蓋 never-attempted、unconfigured、current/options 成功、成功後失敗保留 `lastSuccessAt`；以直跑該測試檔確認紅燈。
- [x] 1.4 實作「由 WeatherService 維護最近一次診斷狀態」決策，提供固定 `WeatherDiagnostic` state/operation/timestamp/code/httpStatus/retryable/safeSummary 契約，並以 `apps/server/src/services/weatherService.test.ts` 全數通過確認狀態轉移。

## 2. 受信任診斷 API

- [x] 2.1 先在 `apps/server/src/routes/weather.test.ts` 建立 `Expose diagnostics only through a trusted management endpoint` 的失敗測試，覆蓋 trusted HTTP 200 `{ diagnostic }`、untrusted denial、never-attempted/unconfigured/error payload，以及 response 不含敏感字串；以直跑該頂層 route 測試檔確認紅燈。
- [x] 2.2 實作「以獨立受信任端點提供診斷」決策，新增 `GET /api/weather/diagnostics` 並維持公開 current/header contract 不含診斷欄位；以 `apps/server/src/routes/weather.test.ts` 與既有 weather contract tests 通過確認權限及相容性。

## 3. MQTT Settings 操作介面

- [x] 3.1 [P] 在 shared/API client 與 `apps/web/src/pages/MqttSettings/viewModel.test.ts` 先建立 `Display the latest weather fetch diagnostic in MQTT Settings` 的失敗測試，覆蓋 ok、error、unconfigured、never-attempted 四種 view state、安全複製內容及時間欄位；以 web focused test 確認紅燈。
- [x] 3.2 實作「在 MQTT Settings 天氣區顯示可複製診斷」決策，讓 `/settings/mqtt` 常駐顯示最近結果，錯誤時突出 code、operation、occurredAt、lastSuccessAt、retryable、safeSummary 與可選 HTTP status，並以 `viewModel.test.ts` 與 `MqttSettingsContent.test.ts` 通過確認呈現與複製 payload 不含敏感資訊。
- [x] 3.3 實作 `Refresh the diagnostic panel after weather operations`，讓頁面初次載入、manual refresh 及 options request settled 後重新讀取 diagnostics，且失敗不清除最後可見診斷；以 `MqttSettingsContent.test.ts` 驗證無須整頁 reload 即更新 current/options operation。

## 4. 整合驗證

- [x] 4.1 執行 server weather service、CWA client 與頂層 weather route 測試，以及 web MQTT Settings focused tests，確認所有新增診斷契約與既有 weather fallback 行為同時通過；頂層 `apps/server/src/routes/weather.test.ts` 必須依 repo 規則直接執行並保留輸出。
- [x] 4.2 執行 `pnpm verify`、`spectra validate expose-weather-fetch-diagnostics` 與 `spectra analyze expose-weather-fetch-diagnostics --json`，確認 monorepo 驗證通過且沒有 Critical/Warning artifact finding。
- [x] 4.3 在受信任管理頁手動觸發一次可控制的 weather failure，確認 panel 可查看與複製 bounded code，公開 `/api/weather/current` 不含診斷細節，且 journald 與頁面 code 可對應但不洩漏敏感資訊；將結果記錄為 change evidence。
