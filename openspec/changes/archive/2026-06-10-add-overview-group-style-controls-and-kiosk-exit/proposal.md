## Why

`Overview` editor 雖然已經能逐卡調整內部樣式，但操作員若只想快速調整整排 KPI 卡或底部 widgets 的玻璃透明度與模糊度，現在必須逐張重複設定，對現場調校太慢。另一方面，現場 kiosk 只有滑鼠時很難觸達 Firefox 視窗角落關閉按鈕，導致操作員即使進入 `裝置狀態` 頁，也沒有可信的一鍵退出路徑回到桌面。

## What Changes

- 在 `Overview` editor 新增兩組直接可見的群組外觀控制，分別同步調整全部 KPI cards 與全部 bottom widgets 的共用 appearance 值。
- 保留既有逐卡/逐 widget 細部欄位，不以群組控制取代單卡 authoring。
- 在 `裝置狀態` 頁新增明確的 `離開系統` 操作，讓受信任操作員可從頁面內退出 kiosk browser。
- 將 kiosk 退出行為綁定到固定的 host helper 與重新進入指引，避免把任意主機命令暴露成一般 device control。
- 固化 `react-grab` 僅在 dev mode 載入的 build contract，避免 production bundle 帶入開發期 devtools 依賴。

## Capabilities

### New Capabilities

- `device-kiosk-exit-control`: 定義裝置狀態頁如何提供可驗證的 kiosk 退出操作，以及退出後如何重新進入桌面 kiosk。

### Modified Capabilities

- `overview-card-internal-style-authoring`: 讓 Overview editor 除了單卡欄位外，也能對 KPI cards 與 density widgets 提供群組外觀控制。
- `device-status-observability-surface`: 讓裝置狀態頁在既有 observability / diagnostics surface 中提供明確的 kiosk 離開入口與再進入說明。
- `shared-build-compatibility`: 讓 web production build 對 dev-only `react-grab` bootstrap 保持排除，不把開發期依賴帶進正式 bundle。

## Impact

- Affected specs: `device-kiosk-exit-control`, `overview-card-internal-style-authoring`, `device-status-observability-surface`, `shared-build-compatibility`
- Affected code:
  - New: `deploy/stop-solar-kiosk.sh`
  - Modified: `apps/web/src/pages/Overview/displayPageConfig.ts`, `apps/web/src/pages/DisplayPagesEditor/index.tsx`, `apps/web/src/pages/DisplayPagesEditor/localization.ts`, `apps/web/src/pages/DeviceStatus/index.tsx`, `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`, `apps/web/src/pages/DeviceStatus/viewModel.ts`, `apps/web/src/services/api.ts`, `apps/server/src/routes/device.ts`, `apps/web/src/main.tsx`, `apps/web/src/devtools/reactGrabBootstrap.ts`, `apps/web/src/devtools/reactGrabBootstrapTarget.ts`, `apps/web/src/devtools/reactGrabNoop.ts`, `apps/web/vite.config.ts`, `apps/web/package.json`, `apps/web/tsconfig.json`, `deploy/install-kiosk.sh`
  - Modified tests: `apps/web/src/pages/Overview/widgetStyles.test.ts`, `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`, `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`, `apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx`, `apps/web/src/pages/DeviceStatus/viewModel.test.ts`, `apps/web/src/services/api.test.ts`, `apps/server/src/routes/device.test.ts`, `apps/web/src/devtools/reactGrabBootstrapTarget.test.ts`
  - Removed: none
