## 1. 橫幅扁平化重構

- [x] 1.1 編輯 `apps/web/src/components/management/RemoteSyncBanner.tsx`，調整其 DOM 結構為左右排版（文字偏左、按鈕偏右），以利高度壓縮。
- [x] 1.2 編輯 `apps/web/src/styles/management.css`，重構 `.mgmt-remote-sync-banner` 樣式為 `flex` 佈局，高度限制在 `64px`，並微調 padding 與 font-size 使其顯得更加精緻 premium。

## 2. 精確調整各設定頁面之 Banner 定位

- [x] 2.1 編輯 `apps/web/src/pages/MqttSettings/mqttSettings.css`，將 `.mgmt-remote-sync-banner` 定位在標題與按鈕的空白處（`left: 450px; top: 18px; width: 850px;`），保證不遮擋 `top: 118px` 的設定卡片。
- [x] 2.2 編輯 `apps/web/src/pages/CircuitSettings/circuitSettings.css`，調整定位至 `left: 420px; top: 18px; width: 640px;`。
- [x] 2.3 編輯 `apps/web/src/pages/ImageManagement/imageManagement.css`，調整定位至 `left: 450px; top: 18px; width: 820px;`。

## 3. 測試與編譯驗證

- [x] 3.1 執行 `pnpm run build` 與相關測試，確保版面完全對齊且功能正常。
