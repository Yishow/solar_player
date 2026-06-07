## Why

`fhd-playback-boundary-classification-2026-06-05.md` 將下列列為 **actual-gap**（CSS 寫死或缺 editor 欄位），加上兩個 binding 疑異，需由本 change 補足/修復；polish change 不得偷加 schema：

- Sustainability 綠 palette（value #57774a / icon #6a8a50 等）為 `.css` custom props，不在 config。
- Sustainability hero copy-en 字級/行高/margin 寫死，且 `copyEnLines` 無 editor text 欄位（只有 `copyZhLines` 有）。
- Factory KPI value/title 字級、hero copy-en 字級寫死於 `factoryCircuit.css`。
- Images hero copy lead 字級/行高/字距寫死於 `.images-copy-block`。
- **Binding bug**：Factory leaf ornament seed opacity 0.38 vs DOM 實測 watermark opacity 1（套用點不一致）。
- **Binding bug**：Sustainability leaf transform matrix 為 identity 但 CSS 設 `--display-leaf-rotation:-28deg`（旋轉可能未套用）。

## What Changes

- 新增 editor-backed 綠 palette tokens（display surface 綠色階），各頁 runtime 改讀 token 而非 CSS 寫死值。
- 為 copy-en（Sustainability/Factory/Images）加入 editor text 與字級欄位，取代 CSS 寫死。
- 修復 Factory leaf opacity 與 Sustainability leaf rotation 的 binding 套用點，使 DOM 實測與 config 一致（先寫 reproduce 測試）。
- 補 seed fallback、validation 與 targeted tests。

## Non-Goals

- 不改 shell、route、API、資料模型。
- 不處理 ornament/media base layout（屬 `extend-display-editor-ornament-and-media-controls`）。
- 不改 Factory circuit routing（屬 `make-factory-circuit-routing-editable-svg`）。
- 不宣告 launch-ready。

## Capabilities

### New Capabilities

- `display-editor-typography-palette-controls`: Editor-backed green palette tokens and copy/typography controls replacing CSS-hardcoded values, plus fixes for the leaf opacity/rotation binding mismatches.

## Impact

- Affected code（實作時細化）：各頁 `*.css` 綠色/字級 custom props → config tokens、`displayPageConfig.ts`、shared chrome/rhythm/palette config、`DisplayPagesEditor` inspector、leaf ornament binding（renderer/CSS 套用點）、對應 *.test.ts。
