## Why

Backend Device、Group、配對與 liveness 能力需要一個可由現場管理者完成日常操作的單一入口；否則約 50 台 Client 仍需手動查資料或逐台處理。管理介面必須沿用既有 management-trusted 邊界，且不暴露給一般 playback session。

## What Changes

- 新增 Device Fleet 管理頁，可建立、編輯、停用 Device，建立 Group 並指派 Site 與 Default Profile。
- 管理者可產生一次性配對連結、重新配對並看見 token 到期資訊，但介面不顯示已簽發 Credential。
- 列表彙整 last seen、route、page、播放狀態、Group／Site 與 duplicate identity warning。
- loading、empty、unpaired、disabled、offline 與 mutation failure 使用明確狀態，避免把未配對誤顯示為任一廠區。
- Route 與 API calls 只在 management session 載入，不讓 playback client 取得管理 mutation surface。

## Capabilities

### New Capabilities

- device-fleet-management-surface: 定義 Device／Group／配對／狀態的管理端操作閉環。

### Modified Capabilities

- device-status-observability-surface: Device Status 加入穩定 Device Identity、Group／Site 與 duplicate warning。
- management-surface-render-invariance: 新管理頁遵循既有 management surface 的載入與錯誤呈現規則。

## Impact

- Affected specs: device-fleet-management-surface, device-status-observability-surface, management-surface-render-invariance
- Affected code:
  - New: apps/web/src/pages/DeviceFleet/index.tsx, apps/web/src/pages/DeviceFleet/loadModel.ts, apps/web/src/pages/DeviceFleet/viewModel.ts, apps/web/src/pages/DeviceFleet/index.test.tsx
  - Modified: apps/web/src/app/router.tsx, apps/web/src/services/api.ts, apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx, apps/web/src/pages/DeviceStatus/viewModel.ts, apps/web/src/components/management/index.tsx
  - Removed: none
