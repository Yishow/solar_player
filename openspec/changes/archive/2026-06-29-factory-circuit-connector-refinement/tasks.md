## 1. 實作 SVG 梳狀連接線 (Comb Connector)

- [x] 1.1 依據 `### 1. 使用 SVG Path 繪製取代靜態圖片`，在 `apps/web/src/pages/FactoryCircuit/index.tsx` 中新增 SVG 元件或渲染區塊。該線路將以配電盤 (board) 的右側中心點作為起點，水平延伸後垂直分岔，並以 6 條水平支線接入 6 個負載 row 的中心位置。滿足 `Unified Comb Output Connector` 的要求。驗證方式：在瀏覽器中手動確認配電盤到負載面板的走線邏輯正確且排版美觀。

## 2. 測試與相容性維護

- [x] 2.1 依據 `### 2. 保留測試所需的圖片匯入與元件宣告`，確保 `apps/web/src/pages/FactoryCircuit/index.tsx` 中原先的 `factory-routing-load-reference.png` 的 import 宣告與常數定義保持完整，以避免影響單元測試。驗證方式：執行 `pnpm test` (或專門執行 `apps/web` 的測試)，確認所有的單元測試包括 `nodeVocabulary.test.ts` 與 `cardFamily.test.ts` 皆能綠燈通過。
