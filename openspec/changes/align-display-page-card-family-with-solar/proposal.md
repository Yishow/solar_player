## Why

目前 `Solar`、`Overview`、`Sustainability` 與 `Images` 的 card 雖然同屬 FHD display surface，但各自維護不同的 header、icon、value row 與 footer 節奏，造成同一家族頁面在視覺語言與 DOM 骨架上逐漸漂移。使用者已明確指定以 `Solar` card 為 reference，對齊 display 五頁的 card 風格，同時要求保留既有外觀、資訊密度與 FHD 幾何不變，並修正數值區目前偏左的問題。

現在起草這個 change，是為了把「共用 card family 的範圍、骨架、非目標與回歸邊界」先定成正式 contract，避免後續只改 CSS 造成表面一致但結構持續分裂，或把 `FactoryCircuit` load row、editor canvas、region tree 等不在範圍內的區塊一起捲入。

## What Changes

- 建立一套以 `Solar` KPI card 為 source of truth 的 display card family contract，覆蓋 `Overview` KPI、`Overview` summary、`Sustainability` KPI/stat、`Images` info card。
- 要求上述 card 在不改變既有頁面幾何、卡片數量、資訊層級與整體外觀方向的前提下，對齊共用的 header、icon、value row 與 footer 節奏。
- 要求 KPI / stat 類 card 的數值區由目前偏左的局部排版調整為 card 內容區水平置中，但不得因此改變 card 尺寸、頁面基線或 FHD canvas 位置。
- 要求 icon 收斂到一致的 SVG 語言與尺寸節奏，避免同一家族 card 混用不同 stroke、容器與圖像來源造成視覺破口。
- 明確排除 `FactoryCircuit` load row、flow nodes、gallery 主舞台、editor/region tree、以及任何 display page 幾何座標調整，讓這次 change 維持在 card family alignment。

## Non-Goals

- 不重新設計 `Solar` 的 flow node、connector、hero 或頁面 title 區。
- 不把 `FactoryCircuit` load row 強行併入同一套 standard card primitive。
- 不更動 `DisplayCanvas` 的 FHD scaling model、各頁 card 寬高/top/left、或 editor 的 canvas workflow。
- 不以「對齊 `Solar`」為理由改變 `Overview` sparkline、`Sustainability` growth note / bullet list、或 `Images` metadata 這些頁面特有內容型態。

## Capabilities

### New Capabilities

- `display-page-shared-card-family`: 定義 display monitoring pages 共用的 card family contract，讓 `Overview`、`Sustainability` 與 `Images` 在保留各自內容型態時，仍與 `Solar` card 對齊外框、icon、標題、數值列與 footer 節奏。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-shared-card-family`
- Affected code:
  - New: `apps/web/src/components/displayPageCards.tsx`, `apps/web/src/components/displayPageCards.css`, `openspec/changes/align-display-page-card-family-with-solar/specs/display-page-shared-card-family/spec.md`
  - Modified: `apps/web/src/pages/Solar/index.tsx`, `apps/web/src/pages/Solar/solar.css`, `apps/web/src/pages/Overview/index.tsx`, `apps/web/src/pages/Overview/overview.css`, `apps/web/src/pages/Sustainability/index.tsx`, `apps/web/src/pages/Sustainability/sustainability.css`, `apps/web/src/pages/Images/index.tsx`, `apps/web/src/pages/Images/images.css`
  - Removed: none
