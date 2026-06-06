## Context

Factory Circuit 目前的 routing 視覺由四個 PNG overlay 承載：PV 到 inverter、inverter 到 switchboard、inverter drop、switchboard 到 load rows。這些圖片被放在版面上後再用 connectorTreatments.strokeWidth 對高度做比例縮放，所以 fresh FHD witness 看到的 fan-out 線條仍偏糊且幾乎不可見；更重要的是，stroke width、opacity、color 無法成為真正可維護的 circuit stroke。

現有 Factory Circuit displayPageConfig 已經保存 nodes 與 loadRows 幾何，shared displayPageFlowTreatmentConfig 已經保存 strokeWidth、opacity、radius、lineCap。這個 change 將 routing 幾何改由 resolved config 推導，讓 runtime 與 editor preview 都使用同一組可調整資料。

## Goals / Non-Goals

**Goals:**

- 讓 Factory Circuit routing 以 inline SVG stroke 呈現，取代 runtime 使用 baked PNG overlay。
- SVG route endpoint 由 resolved nodes 與 loadRows 幾何推導，跟隨 editor-maintainable layout 變化。
- connectorTreatments 新增 strokeColor 欄位，型別為 CSS color string，預設值為 #4ade80。
- inspector 在既有 connector treatment 欄位旁提供 strokeColor 編輯入口。
- 以 TDD 驗證 schema default、inspector field、SVG routing render、strokeWidth、strokeColor、opacity 與幾何來源。

**Non-Goals:**

- 不調整 server API、SQLite schema、MQTT runtime、publish model、route shell、shared header/footer。
- 不重畫或刪除 PNG asset 檔案；只移除 Factory Circuit runtime 對四個 routing overlay import 的使用。
- 不新增 generic routing engine 或跨頁 path DSL。
- 不把 load rows 改成 table-first management UI。
- 不處理其他 playback page 的視覺 closeout。

## Decisions

### Derive SVG routing from Factory geometry config

Factory routing endpoint 取自 resolved config 的 nodes 與 loadRows，而不是從 PNG 尺寸或 page-local pixel constant 反推。節點中心點由 node left/top/width/height 計算；load row endpoint 由 loadRows 的 left/top/width/height 計算。這保留既有 editor geometry ownership，也讓 routing 在 node 或 row 被調整後跟著移動。

Alternative considered: 保留 PNG 並提高 opacity 或 height scale。這只能放大 raster 圖，無法讓 stroke color、stroke width、opacity 成為 crisp editable SVG attribute，因此 rejected。

### Use one absolute SVG overlay inside the circuit layout

Factory Circuit 以單一 absolute SVG overlay 承載所有 route path。SVG viewBox 使用 Factory Circuit 目前的 design canvas 尺寸，CSS 負責覆蓋在既有 layout container 上，pointer-events disabled。route path 使用 stroke、strokeWidth、opacity、strokeLinecap、strokeLinejoin，fill 固定 none。

Alternative considered: 每段 route 各自渲染一個小 SVG。這會增加定位 surface，且不利於用一組 connector treatment 控制 fan-out 視覺，因此 rejected。

### Add strokeColor to shared connector treatment config

FlowConnectorTreatmentConfig 新增 strokeColor: string，預設 #4ade80。此欄位代表 CSS color string；validation boundary 是非空字串並由 inspector 的 color/text control 讓 operator 輸入可被 CSS stroke 使用的值。無效或缺漏值沿用 seed/default merge path，不讓 playback blank 掉。

Alternative considered: 在 Factory Circuit CSS 寫死綠色 stroke。這會繞過 editor-maintainable connectorTreatments，與本 change 目的相反，因此 rejected。

### Keep Factory routing source-like

SVG routing 保留綠色 circuit/fan-out visual language，路徑仍表達 PV、inverter、switchboard、六個 load rows 的拓樸關係。這不是管理表格改版，也不改動 node vocabulary、load card data binding 或 status semantics。

## Implementation Contract

**Observable behavior:** Factory Circuit renders visible crisp routing lines as inline SVG paths. The runtime no longer renders img elements with factory-circuit-routing-reference for the routing overlays. Fan-out from switchboard to six load rows and PV to inverter to switchboard remain visible over the existing circuit layout.

**Interface / data shape:** FlowConnectorTreatmentConfig includes strokeColor: string with default #4ade80. The Factory Circuit SVG applies connectorTreatments.strokeWidth to stroke-width, connectorTreatments.strokeColor to stroke, and connectorTreatments.opacity to opacity. SVG path endpoints are computed from resolved config nodes and loadRows geometry: nodes supply source/target centers, loadRows supply row attachment points.

**Failure modes:** Missing strokeColor falls back to #4ade80 through the shared treatment default path. Missing optional routing endpoint data results in omitting only the affected SVG path rather than rendering a broken path. Existing node/load row content remains rendered.

**Acceptance criteria:** Focused tests fail before implementation and pass after implementation for strokeColor defaults/inspector wiring and Factory Circuit SVG routing. pnpm --filter @solar-display/web test, pnpm --filter @solar-display/server test, pnpm run build, spectra analyze make-factory-circuit-routing-editable-svg --json, spectra validate make-factory-circuit-routing-editable-svg --strict, and graphify update . all exit 0.

**Scope boundaries:** In scope files are FactoryCircuit page/test/CSS/config files, shared displayPageFlowTreatmentConfig, inspector wiring/tests directly needed for strokeColor, and this change directory. Out of scope are shared shell, routes, server, deploy, data model, asset deletion, and other playback page visual rewrites.

## Risks / Trade-offs

- [Risk] SVG paths drift from current visual placement if endpoint math ignores actual config geometry -> Mitigation: tests assert path data contains coordinates derived from displayPageConfig nodes/loadRows.
- [Risk] Adding strokeColor silently affects unsupported pages -> Mitigation: the shared default is additive and existing pages receive the same default unless they explicitly persist another value.
- [Risk] Inspector color input accepts arbitrary CSS strings -> Mitigation: document the boundary as CSS color string and keep fallback path for missing values; do not add broad validation beyond existing treatment config behavior in this narrow change.
- [Risk] SVG overlay blocks interactions in editor preview -> Mitigation: CSS sets pointer-events none for the routing overlay.
