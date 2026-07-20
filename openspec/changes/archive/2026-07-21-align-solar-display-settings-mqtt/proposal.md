## Why

`/settings/mqtt` 是整個前端中最重的單頁狀態流之一，包含 broker config、topic mapping、save/test、status feedback、error handling。若不把它獨立成 change，AI 很容易只對齊版面卻漏掉真正高風險的互動契約。

## What Changes

- 只處理 `/settings/mqtt` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html`。
- 保留 load settings、load topics、save settings、save topics、test connection、status/error feedback contract。
- 產出成功與失敗兩組 MQTT evidence。

## Capabilities

### New Capabilities

- `mqtt-settings-page-alignment`: 定義 `/settings/mqtt` 的高風險視覺對位與互動契約保留。

### Modified Capabilities

(none)

## Impact

- Affected specs: `mqtt-settings-page-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/MqttSettings/index.tsx`
    - `apps/web/src/services/api.ts`
    - `apps/server/src/routes/settings-mqtt.ts`
    - `apps/server/src/routes/settings-mqtt.test.ts`
    - `apps/server/src/routes/settings-mqtt-save-regression.test.ts`
  - New:
    - `apps/web/src/pages/MqttSettings/` 下的 page-local mapping / status adapter 檔案
    - `openspec/changes/align-solar-display-settings-mqtt/specs/`
  - Removed:
    - (none)
