## Why

當前 `/settings/circuits` 頁面的電路卡片（`cs-card`）高度固定為 648px，未填滿至 footer 頂部的可用空間，與 MQTT 頁面等其他後台的 740px 高度不一致。本變更旨在優化卡片高度至 740px，使其完美填滿可用空間至 footer 頂部，並保持與其他設定頁面的一致性。

## What Changes

- 修改 `circuitSettings.css` 內 `.cs-page .cs-card` 的 `height` 從 `648px` 調整為 `740px`。

## Capabilities

### New Capabilities

- `circuit-card-height-alignment`: 將電路設定卡片的高度調整為 740px 以對齊其他設定頁面，填滿至 footer 的空間。

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
