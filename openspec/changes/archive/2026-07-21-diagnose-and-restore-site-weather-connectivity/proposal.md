## Why

現場網路已由資訊課開放指定對外連線，但 Solar Player 仍無法取得 CWA 天氣；同一台 Pi 連維護熱點時可取得，表示問題位於現場網路與 server-side CWA 請求的交界，而不是天氣卡視覺。歷史比對已確認 `32fcb5f6a3d99647ea5a9880fee3cab59ff6126d` 只改前端視覺，`62d2534e85d57bfd71cf1d3b0bd0f33ff27a2d2b` 只加入快取、手動刷新與 MQTT 廣播，兩者都沒有改 CWA client 的 URL、DNS、TLS 或 fetch 實作；真正 transport 根因必須由現場失敗證據決定。

## What Changes

- 建立可在 Pi 上重複執行的現場天氣連線檢查，使用應用程式相同設定與請求路徑，分別判定 DNS、TCP/TLS、HTTP、payload 與 cache 狀態。
- 以目前程式與已知可用行為做 differential comparison；先取得紅燈證據，再只修改被證實失敗的 transport 或 cache 邊界。
- 若現場網路需要資訊課核准的 proxy、CA 或指定 endpoint，提供明確、可部署且不含秘密的 server 設定入口；不得自動改走公共替代服務或維護熱點。
- 讓手動刷新結果明確表示本次是即時上游成功、cached/stale fallback，或哪一層 transport 失敗，避免「資料延遲」掩蓋實際連線錯誤。
- 增加 regression tests 與 Pi live witness，證明現場網路可取得 CWA、維護熱點仍可用、公開 playback contract 不洩漏診斷或憑證。

## Capabilities

### New Capabilities

- `site-weather-connectivity`: 定義 Solar Player 在資訊課核准的受限現場網路上，如何使用明確設定連線 CWA 並驗證即時請求，而不依賴維護熱點或未核准 fallback。

### Modified Capabilities

- `weather-fetch-diagnostics`: 讓診斷結果可區分即時上游成功、cache/stale fallback 與 DNS、TLS、HTTP 等 transport failure，供現場驗證使用。
- `mqtt-settings-weather-management`: 手動更新後顯示該次即時請求的 bounded 結果，不以舊快取或通用「資料延遲」取代連線失敗。

## Impact

- Affected specs: `site-weather-connectivity`, `weather-fetch-diagnostics`, `mqtt-settings-weather-management`
- Affected code:
  - Modified: `apps/server/src/config.ts`, `apps/server/src/services/cwaWeatherClient.ts`, `apps/server/src/services/cwaWeatherClient.test.ts`, `apps/server/src/services/weatherService.ts`, `apps/server/src/services/weatherService.test.ts`, `apps/server/src/routes/weather.ts`, `apps/server/src/routes/weather.test.ts`, `apps/web/src/pages/MqttSettings/index.tsx`, `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`, `apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts`, `packages/shared/src/weather.ts`, `.env.example`
  - New: `scripts/verify-weather-connectivity.mjs`, `scripts/verify-weather-connectivity.test.mjs`
  - Removed: none
- Live systems: installed Pi application configuration and the information-department-approved CWA egress path; no Wi-Fi priority, broker, disk, desktop, or boot changes are in scope.
