## Why

MQTT Settings 與 Circuit Settings 仍各自維護 editable bootstrap path，容易把 persisted controls 與 readiness、weather、stream diagnostics 混在一起。這兩頁適合一起拆出來，專門定義 reusable editable loader contract 與 no-regression safety guard。

## What Changes

- 為 MQTT Settings 與 Circuit Settings 建立 reusable editable loader contract。
- 規範 persisted controls 與 deferred diagnostics 的邊界。
- 加入 no-regression 邊界：dirty guard、masked password、access、save / delete / test 行為不得退化。

## Non-Goals (optional)

- 不處理 Playback Settings 或 Image Management。
- 不改 MQTT、circuit API schema。

## Capabilities

### New Capabilities

- settings-mqtt-circuit-editable-loader-reuse: 定義 MQTT Settings 與 Circuit Settings 的 reusable editable loader 與 deferred diagnostics 邊界。

### Modified Capabilities

(none)

## Impact

- Affected specs: settings-mqtt-circuit-editable-loader-reuse
- Affected code:
  - New: apps/web/src/pages/shared/editableSettingsLoader.ts
  - Modified: apps/web/src/pages/MqttSettings/index.tsx, apps/web/src/pages/CircuitSettings/index.tsx
  - Removed: (none)
