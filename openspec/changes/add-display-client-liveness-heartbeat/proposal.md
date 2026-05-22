## Why

這是一台無人值守的 kiosk 展示機，但目前 server 完全沒有「展示瀏覽器是否還活著、停在哪一頁」的訊號。前端 socket 型別雖定義了 `client:heartbeat`，但實際只在本地更新 `lastHeartbeatAt`，從未送往 server；`SocketService` 也只處理 `connection`，不接收任何 heartbeat。管理端的 `Device Status` 只反映 server 主機的 CPU/記憶體/磁碟，無法判斷展示畫面是否凍結、白屏或停在錯誤頁面。本變更補上展示端存活與目前頁面的回報通道，作為後續看門狗與遠端控制的基礎。

## What Changes

- 前端播放外殼定期透過既有 Socket.IO 連線送出 `client:heartbeat`，內容包含：session 類別、目前路由、目前播放頁 `pageKey`、`isPlaying`、`isIdle`、viewport 尺寸與 client 時間戳。
- `SocketService` 新增 `client:heartbeat` 監聽，維護以 socket id 為鍵的記憶體內展示端登錄表（連線時建立、heartbeat 時更新 `lastSeenAt` 與目前頁面、`disconnect` 時移除）。
- 新增純函式，依 `lastSeenAt` 與設定的存活視窗，將每個展示端分類為 `online` / `stale` / `offline`，並彙總成 liveness snapshot。
- `GET /api/device/status` 的回應 `data` 新增 management-only 的 `displayClients` 欄位（清單 + 彙總計數）。
- `Device Status` 管理頁新增展示端清單區塊，顯示每台展示端的目前頁面、播放狀態、最後回報時間與 online/stale/offline 狀態。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Capabilities

### New Capabilities

- `display-client-liveness`: 展示端定期回報目前頁面與播放狀態，server 追蹤每台展示端的存活狀態並於 Device Status 呈現。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-client-liveness（新增）
- Affected code:
  - New:
    - packages/shared/src/displayClientLiveness.ts
    - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - Modified:
    - packages/shared/src/index.ts
    - apps/server/src/realtime/SocketService.ts
    - apps/server/src/routes/device.ts
    - apps/web/src/services/socket.ts
    - apps/web/src/layouts/LayoutShell.tsx
    - apps/web/src/pages/DeviceStatus/viewModel.ts
    - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
    - apps/web/src/services/api.ts
  - Removed:
    - (none)
