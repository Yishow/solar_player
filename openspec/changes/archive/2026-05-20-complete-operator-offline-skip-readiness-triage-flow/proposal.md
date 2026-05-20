## Why

`Offline`、`Device Status`、`Playback Settings` 雖然各自已經能顯示 fallback route、skip reason、readiness blocking 與 alerts，但目前還缺少一條完整的 operator triage flow。操作者看得到系統退化，卻還要自己跨頁拼出「哪一頁被跳過、為什麼跳過、要去哪裡修」。

## What Changes

- 建立跨 `Offline`、`Device Status`、`Playback Settings` 的 display fault triage contract，讓 skip / readiness / offline 狀態能互相對照。
- 讓故障摘要不只顯示「有問題」，而是能指出受影響頁面、主導原因、以及下一個治理入口。
- 補齊 triage regression tests，避免未來又退回只剩單點警示頁。

## Non-Goals

- 不重寫 display readiness、rotation plan 或 offline routing 核心判定邏輯。
- 不新增新的 device control 或告警傳輸通道。

## Capabilities

### New Capabilities

- `display-fault-triage-flow`: 定義 operator 如何從 offline / skip / readiness 訊號追到受影響頁面與對應治理入口。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-fault-triage-flow`
- Affected code:
  - Modified: `apps/web/src/pages/OfflineError/index.tsx`
  - Modified: `apps/web/src/pages/OfflineError/viewModel.ts`
  - Modified: `apps/web/src/pages/PlaybackSettings/index.tsx`
  - Modified: `apps/web/src/pages/PlaybackSettings/viewModel.ts`
  - Modified: `apps/web/src/pages/DeviceStatus/index.tsx`
  - Modified: `apps/web/src/pages/DeviceStatus/viewModel.ts`
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `packages/shared/src/deviceDisplayOps.ts`
  - Modified: `packages/shared/src/displayOps.ts`
