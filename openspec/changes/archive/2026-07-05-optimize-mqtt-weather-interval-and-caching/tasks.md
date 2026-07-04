## 1. 資料庫與型別定義

- [x] 1.1 更新資料庫初始化邏輯 (Database Schema)，使 SQLite `weather_settings` 資料表具備 `update_interval_minutes` 欄位。驗證目標：執行 `pnpm test` 後端測試以確認 schema 更新成功且未引發其他錯誤。
- [x] 1.2 擴充 `@solar-display/shared` 中的 `WeatherSettings` 型別 (Type definitions)，加入 `updateIntervalMinutes: number` 屬性，並在 `DEFAULT_WEATHER_SETTINGS` 中設定預設值為 `30`。驗證目標：在 packages/shared 下運行 `pnpm build` 通過編譯。

## 2. 後端快取與快照發佈

- [x] 2.1 參照 `Decision 1: Lazy-loaded server cache with clear-on-force`，修改 `WeatherService` 實作隨動式快取，當獲取目前天氣時若在更新頻率內直接從記憶體快取返回。驗證目標：在 `weatherService.test.ts` 中新增測試用例，模擬兩次連續獲取，確認第二次直接返回快取且沒有發送新的 CWA API 請求。
- [x] 2.2 參照 `Decision 2: MQTT weather snapshot broadcast` 與 `Support server-side weather caching and MQTT broadcast` 需求，當 CWA API 獲取天氣成功時，調用 `MqttClientService.publish` 將最新的天氣 Snapshot JSON (MQTT Broker Payload) 廣播至 `solar/weather/current` Topic。驗證目標：在 `MqttClientService.test.ts` 相關測試中，驗證 CWA 獲取成功後有調用 publish 行為發送 JSON payload。
- [x] 2.3 實作 `POST /api/weather/refresh` 與修訂 `PUT /api/weather/settings` 路由以處理手動刷新與更新頻率設定的變更 (API Contract)。驗證目標：運行 `weather.test.ts` 整合測試，確保這兩個 endpoint 行為正常且能正確保存更新頻率。

## 3. 前端設定頁面與手動重新整理

- [x] 3.1 參照 `Configure weather settings from MQTT Settings` 與 `Support manual weather refresh` 需求，在 `MqttSettingsContent` 天氣設定卡片上新增「更新頻率」選單與「立即更新 (Refresh Now)」按鈕 (Frontend UI)。選單選項包括 10分鐘、30分鐘、1小時、3小時、6小時、12小時及手動。驗證目標：在 `MqttSettingsContent.test.ts` 中確認選單與按鈕被正確渲染，且按鈕點擊時會觸發 API 請求。

## 4. 播放端自動輪詢與過期顯示

- [x] 4.1 參照 `Decision 3: Polling in frontend hooks` 與 `Support polling for weather updates` 需求，修改 `useHeaderWeatherMeta` 與 `useOverviewWeather` 兩項 hooks。若 `updateIntervalMinutes` 大於 0，則按其設定時間以 `setInterval` 進行天氣拉取。驗證目標：編寫測試驗證 hooks會隨時間變化自動觸發 `getHeaderWeatherContract` 輪詢拉取。
- [x] 4.2 參照 `Preserve the weather slot with explicit fallback states` 需求，當前天氣 Snapshot 資料大於 `2 * updateIntervalMinutes` 時，Header 顯示為 Stale 過期狀態（如 secondaryText 顯示為延遲提示）。驗證目標：在 `headerWeatherMeta.test.ts` 中新增過期時間測試用例，驗證過期時輸出的 `state` 為 `stale` 且 secondaryText 符合預期。
