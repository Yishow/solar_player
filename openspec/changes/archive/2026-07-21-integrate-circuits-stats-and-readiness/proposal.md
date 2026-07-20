## Why

當前電路設定頁的統計數據條（`cs-stats`）、readiness 狀態列（`cs-readiness`）與 findings 列表（`cs-readiness-list`）以垂直堆疊方式排列，佔用了卡片大量的上方垂直空間，且在多重狀態欄並存時顯得擁擠。整合成並列的面板結構能大幅提升資訊呈現效率與版面美感。

## What Changes

- 在 `CircuitSettingsContent.tsx` 中建立一個 `.cs-summary-panel` 容器，將 readiness 狀態說明與 findings 列表（左側）與統計數據條 `cs-stats`（右側）整合為左右並列的結構。
- 在 `circuitSettings.css` 中設定 `.cs-summary-panel` 的 Grid/Flex 排版，將 `.cs-stats` 分為三列（3 columns）的 Grid 佈局，一併將左側狀態標籤 `.cs-readiness` 調整為 `width: 100%` 往右填滿可用寬度，並優化警示卡片（findings items）在 hover 時的平滑陰影與上浮互動特效。

## Capabilities

### New Capabilities

- `circuits-stats-readiness-panel-integration`: 將電路設定頁面的統計數據條、狀態列與 findings 列表整合為並列面板佈局。

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
