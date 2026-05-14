## Why

目前 `/solar` 仍以 `PageScaffold` 的 dashboard title block 與 grid panel 組成，視覺結構與 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 的 1920x1080 playback canvas 明顯脫節。這一頁同時包含 shell、hero、flow diagram、connector 與 KPI row；若不把 `/solar` 獨立成一個更細的 FHD canvas change，後續實作容易延續管理頁骨架，無法建立可重用的 playback 對位模式。

## What Changes

- 為 playback 頁建立一個專用的 1920x1080 FHD canvas shell，包含可縮放 viewport、header shell、footer nav、page number pill、decorative slogan/leaf 元件，但不取代管理頁沿用的 `PageScaffold`。
- 重構 `/solar` 頁面結構，改以 absolute-position 的 FHD canvas composition 呈現 title group、leaf watermark、gold line、hero photo、四個 flow nodes、三條 connectors 與五張 KPI cards，使其接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html`。
- 保留 `useLiveMetrics()`、`buildSolarViewModel()`、socket/live metrics fallback 行為與既有文案數值來源，同時把 flow/KPI icon 從 emoji 改成 reference 對應的 generated PNG asset binding。
- 集中管理 `/solar` 的 layout constants、asset mapping 與 icon key，避免 reference 座標與 fallback mapping 散落在 JSX。

## Non-Goals

- 不重寫 backend、MQTT、socket service contract 或 live metrics hook。
- 不把所有頁面都改成 FHD canvas，也不全域移除管理頁使用的 `PageScaffold`。
- 這一輪不追求 1px pixel-perfect，也不接入真實 clock 或 weather API。

## Capabilities

### New Capabilities

- `playback-solar-fhd-canvas-alignment`: 定義 `/solar` 的 playback-only FHD canvas shell、reference object mapping、asset binding 與 runtime contract preservation。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-solar-fhd-canvas-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Solar/index.tsx`
    - `apps/web/src/pages/Solar/viewModel.ts`
  - New:
    - `apps/web/src/components/DisplayCanvas.tsx`
    - `apps/web/src/pages/Solar/layout.ts`
    - `apps/web/src/pages/Solar/solar.css`
    - `openspec/changes/align-solar-display-playback-solar-fhd-canvas/specs/`
  - Removed:
    - (none)
