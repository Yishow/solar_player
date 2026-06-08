## 1. 結構與樣式優化

- [x] 1.1 編輯 `apps/web/src/components/management/RemoteSyncBanner.tsx`，為橫幅容器加上 `mgmt-remote-sync-banner` 樣式類別。
- [x] 1.2 編輯 `apps/web/src/styles/management.css`，為 `.mgmt-interactive-card` 加上 `transform-style: preserve-3d`、`perspective: 1000px` 與 `backface-visibility: hidden`，防範 hover 平移時 subpixel 模糊抖動。

## 2. 各頁面絕對定位與對齊

- [x] 2.1 編輯 `apps/web/src/pages/CircuitSettings/circuitSettings.css`，絕對定位 `.cs-page .mgmt-remote-sync-banner` 至 header 空檔處。
- [x] 2.2 編輯 `apps/web/src/pages/ImageManagement/imageManagement.css`，絕對定位 `.image-mgmt-page .mgmt-remote-sync-banner` 至 header 空檔處。
- [x] 2.3 編輯 `apps/web/src/pages/MqttSettings/mqttSettings.css`，絕對定位 `.mqtt-settings-page .mgmt-remote-sync-banner` 至 header 空檔處。
- [x] 2.4 編輯 `apps/web/src/pages/PlaybackSettings/playbackSettings.css`，絕對定位 `.playback-settings-page .mgmt-remote-sync-banner` 至適當空檔處。

## 3. 專案驗證

- [x] 3.1 執行專案測試與編譯，確保一切功能正常。
