## Context

目前 `/factory-circuit` 頁面中使用 `factory-routing-load-reference.png` 圖片來呈現配電盤到負載面板的連接線。這張圖片中線路分成 3 個獨立的分支區域（上、中、下各一對二），不符合配電盤「單一統一輸出，再分流」的物理與電路行為。

## Goals / Non-Goals

**Goals:**
* 將配電盤到負載面板的連接線修改為從配電盤中心點統一輸出（單一主幹），然後垂直分開並分支出 6 條線分別接入 6 個負載 row 的中心。
* 保持線條的視覺風格與專案內的其他連接線（如 inverterToBoard, `#527d3b` 顏色，粗細約 8px，無花哨的動態效果）一致。
* 保證單元測試（`nodeVocabulary.test.ts`）通過。

**Non-Goals:**
* 不調整其他頁面。
* 不變更其他 node 的佈局與位置。
* 不新增或修改 editor API 或是資料模型。

## Decisions

### 1. 使用 SVG Path 繪製取代靜態圖片
為了實現「統一輸出、分流 6 條」的拓撲結構，我們使用 SVG `<svg>` 與 `<path>` 來取代原本的靜態圖片。
* 起點 (配電盤右側中心)：X = 1258, Y = 454 (即配電盤 top 286 + height 336/2)。
* 垂直匯流排 (Busbar)：在 X = 1290 處。從 Y = 188 到 Y = 663。
* 分支線：6 條水平線從 X = 1290 連接到 X = 1392 (負載面板左側)，垂直高度分別對齊 6 個負載 row 的中心：188, 283, 378, 473, 568, 663。
* 視覺風格：使用 `stroke="#527d3b"`，`strokeWidth="8"`，`strokeLinecap="round"`，`strokeLinejoin="round"`。

### 2. 保留測試所需的圖片匯入與元件宣告
`nodeVocabulary.test.ts` 強制要求 `index.tsx` 中必須匯入 `factory-routing-load-reference.png`，並且必須定義 `FactoryCircuitRoutingReference` 元件與相關常數。
我們將在 `index.tsx` 中保留這些匯入與定義，但實際渲染時，將這條特定的 load 線路替換為 SVG 元件，而不渲染 `factoryRoutingLoadReferenceUrl`。

## Implementation Contract

* **Behavior**: 使用者在 `/factory-circuit` 頁面會看到配電盤右側僅有一條深綠色的線出來，隨後像樹枝一樣垂直分開，最後有 6 條水平綠色線對接到右側 6 個負載卡片。
* **Interface / data shape**: 無介面變動，無資料模型變動。
* **Failure modes**: 當負載座標調整時，SVG 繪製路徑應能正常反應。
* **Acceptance criteria**:
  * 執行 `pnpm test` 或 `@solar-display/web` 的測試全部通過。
  * 視覺上無殘留的 3 區 PNG 圖片。

## Risks / Trade-offs

* **[Risk]** 連接線的起點與終點與實際元件重疊不夠精準。
  * **Mitigation**: 依據 `layout.ts` 內的精確數值計算出絕對座標，保證線條與配電盤、負載卡片邊緣完美重合。
