## Why

Phase 2 fresh witness（`fhd-playback-witness-polish-pass-1-2026-06-06.md`）確認 Overview/Sustainability hero 偏淡/洗白、ring glow 等質感差距，且 `fhd-playback-boundary-classification-2026-06-05.md` 將以下列為 **actual-gap**（無 editor 欄位、或 page-local hardcode / CSS 寫死），polish change 不得偷加 schema，須由本 editor-capability change 補足：

- Hero media 飽和/對比（heroMedia 效果目前僅 opacity/blur，無 saturation/contrast）。
- Solar gold line 基底 left/top/width 與傾斜角（`index.tsx` page-local hardcode）。
- Solar / Sustainability leaf ornament 基底 layout（left/top/width/height hardcode）。
- Ring ornament thickness / inner glow（部分為內層 SVG，rect 量不到）。
- Images media stage 圓角 / soft-shadow / 全出血切換（目前由 viewModel `isReferenceHeroCrop` 自動決定，無 editor toggle）。
- Images thumbnail 圓角（`images.css` 寫死）。

## What Changes

- 擴充 shared media effect config，加入 saturation/contrast（heroMedia 適用面），並接 inspector 欄位。
- 擴充 gold line / leaf ornament chrome config，加入基底 layout（left/top/width/height）與 gold line 傾斜角欄位，取代 page-local hardcode。
- 擴充 ring ornament config 的 thickness / glow 表達。
- 為 Images media stage 加入 editor 可控的圓角 / shadow / 全出血 toggle，取代 viewModel 自動判斷。
- 各頁 runtime renderer 改為消費 resolved config；補 seed fallback、validation 與 targeted tests。

## Non-Goals

- 不改 shared header/footer shell、route、API、資料模型。
- 不處理 typography/palette/字級 actual-gap（屬 `extend-typography-palette-and-fix-ornament-bindings`）。
- 不改 Factory circuit routing（屬 `make-factory-circuit-routing-editable-svg`）。
- 不宣告任何頁 launch-ready。

## Capabilities

### New Capabilities

- `display-editor-ornament-media-controls`: Editor-backed controls for hero media saturation, ornament base layout/tilt, ring treatment, and Images stage framing, replacing page-local hardcodes and CSS-only values.

## Impact

- Affected code（實作時細化）：`apps/web/src/pages/shared/displayPageMediaEffectConfig.ts`、`displayPageChromeConfig.ts`、各頁 `displayPageConfig.ts` 與 runtime renderer、`DisplayPagesEditor` inspector 欄位、對應 *.test.ts。
