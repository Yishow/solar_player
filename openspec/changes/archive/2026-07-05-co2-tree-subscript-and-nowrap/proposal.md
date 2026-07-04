## Why

為提升視覺精緻度並符合科學書寫規範，將 CO2 卡片中的「CO2」調整為化學式格式「CO₂」（使用 `<sub>2</sub>` 標籤實現），且將該行生態換算資訊強制排版為單行顯示，避免因寬度限制折行。

## What Changes

- 修改 `OverviewKpiFooter.tsx`，使用 `CO<sub>2</sub>` 標籤替換 `co2`。
- 修改 `overview.css` 中的 `.overview-kpi-footer-tree-text` 或 `.overview-kpi-footer-tree`，加入 `white-space: nowrap;` 並微調 `font-size`，確保單行完整呈現。
- 更新對應的測試 `kpiFooter.test.tsx` 的 HTML 比對斷言。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `overview-kpi-card-polish`: 調整 CO2 減量卡片 footer 之文案 HTML 標記與 CSS 排版。

## Impact

- Affected specs:
  - `overview-kpi-card-polish`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Overview/kpiFooter.test.tsx
