## Context

為了提升 CO2 卡片中化學式的呈現效果，需要將其改為 `CO<sub>2</sub>` 標籤以實現下標效果。
此外，為防止該行長字串在卡片中因寬度不足而拆成兩行，將在 CSS 中施加 `white-space: nowrap` 並微調字型大小，使其完美限制在一行之內。

## Goals / Non-Goals

**Goals:**

- 將 `CO2` 中的 `2` 使用下標 `<sub>2</sub>` 呈現。
- 使生態換算文字始終在單行內完整顯示。
- 保持現有單元測試綠燈，且比對符合下標的 HTML markup。

## Decisions

### 1. JSX 中套用 <sub> 標籤

在 `OverviewKpiFooter.tsx` 中將 `co2` 修改為 `CO<sub>2</sub>`。

### 2. CSS 單行強制排版與縮放

在 `overview.css` 中：
- 對 `.overview-kpi-footer-tree-text` 加入 `white-space: nowrap;`。
- 對 `.overview-kpi-footer-tree` 的 `font-size` 進行微調（例如調小至 `11.5px`），以確保長字串在 352px（扣除 padding 後 304px）的卡片寬度內完整呈現且不折行。
