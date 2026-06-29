## Summary

將 `/factory-circuit` 頁面上配電盤到負載面板的連接線修改為由配電盤統一輸出，再分岔成 6 條水平支線接入負載。

## Motivation

目前 `/factory-circuit` 頁面中配電盤到負載面板的連接線是分成 3 區（透過 PNG 圖片渲染），不符合實際的物理或電路邏輯。使用者希望將其改為統一從配電盤中心點輸出，隨後垂直分岔，並以 6 條分支水平接入右邊的 6 個負載 row。

## Proposed Solution

1. 保持原有的線條視覺風格（顏色、粗細），但不使用原本寫死走線的 `factory-routing-load-reference.png` 靜態圖片。
2. 在 `apps/web/src/pages/FactoryCircuit/index.tsx` 中，改用客製化 inline `<svg>` 元件繪製這條連接線。
3. 線路路徑計算：
   - 起點 (startX, startY)：從配電盤右側的中心點出發，對齊配電盤的右側 X 座標與垂直中心 Y 座標。
   - 主線 (Trunk)：水平向右延伸一段距離（至 X = 40）。
   - 垂直匯流排 (Busbar)：在該 X 座標垂直向下 and 向上分開。
   - 6 條分支 (Branches)：分別從垂直匯流排在 6 個負載 row 的中心高度處水平延伸到負載 row 的左側。
4. 設定與其他 connector 一致的 `stroke` 顏色 (`#527d3b`)，`strokeWidth` 設為大約 8px 以對齊原本圖片的視覺粗細。
5. 為了通過既有單元測試（`nodeVocabulary.test.ts`），保留對 `factory-routing-load-reference.png` 的匯入和宣告，但實際網頁中不渲染它。

## Capabilities

### New Capabilities

- `factory-circuit-connector-refinement`: 將 `/factory-circuit` 頁面配電盤與負載之間的連接線改為單一輸出、中間垂直分岔的 comb 走線行為。

## Impact

- Affected specs: `factory-circuit-connector-refinement`
- Affected code:
  - Modified:
    - apps/web/src/pages/FactoryCircuit/index.tsx
  - New:
    - (none)
  - Removed:
    - (none)
