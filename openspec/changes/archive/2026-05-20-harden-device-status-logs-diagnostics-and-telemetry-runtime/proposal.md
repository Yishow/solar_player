## Why

`Device Status` 目前混合了真實 display summary、可能失效的 server route、以及前端硬編碼 telemetry 值。對 operator 而言，這會讓頁面失去可信度，因為他無法判斷哪些資訊真能拿來做營運判讀。

## What Changes

- 讓 device log access 在現有 ESM server runtime 下維持可用，避免 log listing / export 在實際裝置上成為壞路徑。
- 讓 `Device Status` diagnostics action 的名稱、輸出與 server-side 行為一致，保留安全只讀/刷新邊界，但不得再是假動作。
- 讓前端 telemetry cards 只顯示真實量測值或明確 unavailable 狀態，不再混入硬編碼監控數值。
- 補齊對應 server / web regression tests，確保安全邊界與可信輸出都可驗證。

## Non-Goals

- 不新增危險 device control，例如 reboot、shell、遠端執行。
- 不把 `Device Status` 擴成完整 APM 或外部 observability 平台。

## Capabilities

### New Capabilities

- `device-status-runtime-telemetry`: 定義 Device Status 僅展示可被信任的 runtime telemetry 或明確 unavailable 狀態。
- `device-status-log-access`: 定義 Device Status 的 log listing / export 路徑在現有 server runtime 下可安全讀取。

### Modified Capabilities

- `device-status-display-diagnostics`: 將 diagnostics action 收斂為真正可解釋的安全讀取/刷新動作，而非僅回傳 placeholder feedback。

## Impact

- Affected specs: `device-status-runtime-telemetry`, `device-status-log-access`, `device-status-display-diagnostics`
- Affected code:
  - Modified: `apps/server/src/routes/device.ts`
  - Modified: `apps/server/src/routes/device-display-ops.ts`
  - Modified: `apps/server/src/services/deviceDisplayOpsService.ts`
  - Modified: `apps/web/src/pages/DeviceStatus/index.tsx`
  - Modified: `apps/web/src/pages/DeviceStatus/viewModel.ts`
  - Modified: `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/DeviceStatus/viewModel.test.ts`
  - Modified: `apps/server/src/routes/device-display-ops.test.ts`
  - Modified: `apps/server/src/routes/device.test.ts`
