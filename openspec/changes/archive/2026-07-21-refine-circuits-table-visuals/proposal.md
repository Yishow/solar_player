## Why

當前 `/settings/circuits` 設定頁面的表格（`cs-table`）有些許排版較為鬆散，尤其是 Display Slot 欄與 Icon 欄因多個元素垂直堆疊，拉長了整列的高度。此外，表格列缺乏 hover 回饋、邊框圓角不夠流暢。本變更旨在優化表格整體的排版密度與視覺美感，並確保所有的 CRUD 互動功能完好無損。

## What Changes

- 修改 `CircuitRow.tsx` 中的 DOM 結構，將 `col-display` 欄（Switch 開關與 Select 下拉選單）與 `col-icon` 欄改為緊湊橫排或網格佈局以降低列高。
- 修改 `circuitSettings.css` 以美化 `cs-table-wrap` 的圓角與滾動條陰影，增加 `tr:hover` 的高亮背景，並優化臨界值 Pill 與輸入框元件的視覺整合。

## Capabilities

### New Capabilities

- `circuits-table-visual-refinement`: 優化電路設定表格的排版密度、視覺效果與互動反饋。

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/CircuitSettings/CircuitRow.tsx
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
