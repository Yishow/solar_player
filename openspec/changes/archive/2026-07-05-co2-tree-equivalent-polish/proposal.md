## Why

為了讓 CO2 KPI 卡片下方的生態換算數值更符合實際情況，預設將原本的換算公式調整為：「1棵樹20年，平均吸收160kg co2」，並將對應的 footer 文字描述修改為「約種植？棵樹（1棵樹20年，平均吸收160kg co2）」。

## What Changes

- 修改 `OverviewKpiFooter.tsx` 中的換算係數 `co2TreeEquivalentFactor`，由原本的 `2.6` 調整為 `6.25`。
- 修改 `OverviewKpiFooter.tsx` 中的顯示文字，將「相當於種植 ? 棵樹」更換為「約種植 ? 棵樹（1棵樹20年，平均吸收160kg co2）」。
- 更新對應的測試 `kpiFooter.test.tsx` 以反映新的換算與文字斷言。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `overview-kpi-card-polish`: 修改 CO2 卡片的 footer 樹木換算邏輯與顯示文案。

## Impact

- Affected specs:
  - `overview-kpi-card-polish`
- Affected code:
  - Modified:
    - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
    - apps/web/src/pages/Overview/kpiFooter.test.tsx
