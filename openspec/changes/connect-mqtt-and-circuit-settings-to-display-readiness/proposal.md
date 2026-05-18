## Why

`MqttSettings` 與 `CircuitSettings` 現在只負責保存 broker、topic mapping 與 circuit 資料，卻沒有告訴展示頁這些設定是否足以支撐 Overview、Solar、Factory Circuit 的正式顯示。當 metric key 缺 topic、circuit 沒綁到 slot，或閾值設定不合理時，問題會拖到播放端才被看見，排查成本很高。

## What Changes

- 讓 `MqttSettings` 顯示展示頁需求覆蓋率，直接指出哪些 display metrics 尚未映射 topic、哪些映射已失效，及其影響頁面。
- 讓 `CircuitSettings` 承接 display semantic slot 綁定，讓 Factory Circuit 與其他用電相關顯示不再靠 icon 或名稱 heuristics 推測資料來源。
- 補上 readiness checks，讓 MQTT 與 circuit 設定頁能在儲存前後顯示目前設定是否足以支持正式展示頁，並列出缺口與修復建議。
- 將設定變更事件接入 display readiness 狀態，讓 display editor、播放設定頁與裝置狀態頁可同步看到資料來源是否達到可播標準。

## Capabilities

### New Capabilities

- `mqtt-settings-display-coverage`: 提供 MQTT 設定頁對展示頁 metric mapping 覆蓋率與失效 mapping 的可視化檢查能力。
- `circuit-settings-display-slot-binding`: 提供迴路設定頁對展示頁 load slot 與 circuit 的明確綁定能力。
- `display-readiness-checks`: 提供設定頁保存後的展示頁 readiness 檢查、缺口清單與同步狀態能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `mqtt-settings-display-coverage`, `circuit-settings-display-slot-binding`, `display-readiness-checks`
- Affected code:
  - Modified: `apps/web/src/pages/MqttSettings/index.tsx`, `apps/web/src/pages/CircuitSettings/index.tsx`, `apps/web/src/pages/FactoryCircuit/viewModel.ts`, `apps/web/src/services/api.ts`, `apps/server/src/routes/settings-mqtt.ts`, `apps/server/src/routes/circuits.ts`, `apps/server/src/realtime/SocketService.ts`, `packages/shared/src/types.ts`
  - New: `apps/server/src/services/displayReadinessService.ts`, `apps/server/src/routes/display-readiness.ts`, `packages/shared/src/displayReadiness.ts`
  - Removed: none
