## Why

目前 settings/status 相關 management surfaces 雖然共享同一個殼層與品牌基調，但實際上仍停在 route-local CSS 各自長一套卡片、banner、preview、table 與 dashboard 語言。現有 tokens 主要只覆蓋 card、action、status chip 的最低共通層，無法支撐 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`、`/slideshow-preview`、`/device-status` 之間的 design-token 對齊與功能型 surface differentiation。

## What Changes

- 建立 display-ops settings/status surfaces 的 semantic token foundation，明確區分 operations surface、preview surface、status dashboard surface 三個語義層。
- 抽出 shared management primitives，覆蓋 page title、section board、info banner、stat strip、table shell、runtime status、sticky action area 等常見 surface。
- 定義 settings family 與 status family 的 adoption contract，讓各頁差異回到資訊結構與功能責任，而不是各自硬寫 palette、radius、border、shadow 與 spacing。
- 保留既有 management shell、editor handoff、readiness/status semantics，不在 foundation change 內重開資訊架構或復活已整合回 editor 的舊入口。

## Capabilities

### New Capabilities

- `display-ops-surface-primitive-system`: 定義 settings/status 相關 management surfaces 可共用的 semantic design tokens 與 reusable surface primitives。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-ops-surface-primitive-system
- Affected code:
  - New:
    - apps/web/src/components/management/opsSurfacePrimitives.tsx
    - apps/web/src/components/management/opsSurfacePrimitives.test.tsx
  - Modified:
    - apps/web/src/styles/tokens.css
    - apps/web/src/styles/management.css
    - apps/web/src/pages/PlaybackSettings/playbackSettings.css
    - apps/web/src/pages/ImageManagement/imageManagement.css
    - apps/web/src/pages/MqttSettings/mqttSettings.css
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
    - apps/web/src/pages/SlideshowPreview/preview.css
    - apps/web/src/pages/DeviceStatus/device.css
  - Removed:
    - (none)
