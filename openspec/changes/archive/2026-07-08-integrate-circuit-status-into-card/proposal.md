## Why

當前 `/settings/circuits` 的狀態列（`cs-status`）是透過絕對定位漂浮在頁面右上角，不僅破壞了「廠區用電迴路」卡片的區塊完整性，也造成版面排版上不夠精確與美觀。此外，表格與輸入框外觀較為陽春，需要進一步精緻化其互動與視覺層次。本變更旨在整合狀態列並美化整體頁面視覺，且保證所有 CRUD 功能完整不遺失。

## What Changes

- 將 `CircuitSettingsContent` 內的 `<div className="mgmt-status cs-status">` 元素從原本的 layout 頂層移入 `cs-card` 的 `settings-card__title` 之中。
- 修改 `circuitSettings.css` 移除 `cs-status` 的絕對定位屬性，改為符合卡片標題內部並排的 `inline-flex` 佈局。
- 優化 `cs-input`、`cs-table`、`cs-delete` 以及 `cs-legend` 的視覺樣式，包含加上平滑的陰影、更精確的邊框圓角與主題配色。

## Capabilities

### New Capabilities

- `circuit-settings-status-card-integration`: 整合 `/settings/circuits` 的狀態列（`cs-status`）至廠區用電迴路卡片標題（`settings-card__title`）中。
- `circuit-settings-visual-refinement`: 優化電路設定頁面的輸入框互動與整體表格視覺層次。

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
