## Why

`/settings/mqtt` 已經承接 broker、topic runtime、display coverage 與 weather header configuration，但目前 workspace 仍以長條平鋪 rows 為主，coverage 與 weather preview 雖然存在，卻還沒有形成清楚的 section-level operations guidance。頁面功能並不算少，但可操作性與 surface hierarchy 還不夠完整。

## What Changes

- 對齊 `MQTT Settings` 的 operations surface tokens，讓 broker、topic workspace、weather settings 與 runtime feedback 讀成同一套治理工作台。
- 重新整理 topic workspace 的資訊結構，強化 metric family、display impact、runtime state、coverage finding 與 draft/save scope 的可讀性。
- 補齊 weather header configuration 的 effective preview 與 feedback hierarchy，讓 operators 能更快理解設定會如何影響 management/playback shell metadata。
- 保留 broker status、connection test、save mappings、idle runtime 等高風險狀態的顯式可讀性，不被視覺收斂稀釋。

## Capabilities

### New Capabilities

- `mqtt-settings-operations-surface`: 定義 MQTT settings 作為 broker management、topic runtime governance、coverage triage、weather configuration workspace 的完整 surface contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: mqtt-settings-operations-surface
- Affected code:
  - New:
    - apps/web/src/components/management/mqttCoverageWorkspace.tsx
    - apps/web/src/components/management/mqttCoverageWorkspace.test.tsx
  - Modified:
    - apps/web/src/pages/MqttSettings/index.tsx
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/MqttSettings/viewModel.ts
    - apps/web/src/pages/MqttSettings/mqttSettings.css
    - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
    - apps/web/src/hooks/useDisplayOpsSummary.ts
  - Removed:
    - (none)
