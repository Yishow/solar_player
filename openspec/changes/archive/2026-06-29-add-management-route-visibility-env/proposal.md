## Why

業主目前不想在 kiosk/管理介面看到歷史與趨勢頁，但這兩頁仍是產品的一部分，不能用刪路由或硬改 navigation 的方式處理。需要一個可部署設定控制的管理頁可見性機制，預設隱藏 /trends 與 /history，並保留未來重新開啟的能力。

## What Changes

- 新增 .env / Vite build-time 設定 VITE_HIDDEN_MANAGEMENT_ROUTES，用逗號分隔管理路由 path。
- .env.example 預設設定 VITE_HIDDEN_MANAGEMENT_ROUTES=/trends,/history。
- 管理 footer/nav 依 route metadata 與 hidden route 設定隱藏指定管理頁。
- 直接進入 hidden management route 時導回安全的可見管理頁或 /overview，不載入被隱藏頁面的 runtime data。
- 保留五個 playback routes 與 playback_pages.enabled 的既有語意；本設定只控制 management route 可見性。

## Non-Goals

- 不刪除 /trends 或 /history 的實作與 server API。
- 不把 management route visibility 存進 SQLite；此 change 僅做部署環境設定。
- 不改 playback page enablement、rotation 或 DisplayPagesEditor registry。

## Capabilities

### New Capabilities

- `management-route-visibility-env`: 定義 management routes 可由 VITE_HIDDEN_MANAGEMENT_ROUTES 隱藏、nav 不顯示、直接存取被導回的行為。

### Modified Capabilities

(none)

## Impact

- Affected specs: management-route-visibility-env
- Affected code:
  - Modified: .env.example
  - Modified: apps/web/src/app/routeMeta.ts
  - Modified: apps/web/src/app/router.tsx
  - Modified: apps/web/src/layouts/ManagementShell.tsx
  - Modified: apps/web/src/components/AppFooterNav.tsx
  - New: apps/web/src/app/managementRouteVisibility.ts
  - New: apps/web/src/app/managementRouteVisibility.test.ts
  - Modified: apps/web/src/layouts/brandBootstrap.test.ts
