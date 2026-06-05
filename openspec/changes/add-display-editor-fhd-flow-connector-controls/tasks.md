## 0. Coverage map

- [x] 0.1 Cover requirement `Editor SHALL expose FHD connector treatment controls for supported flow pages` by implementing editor-backed connector stroke, opacity, line cap, radius, and layer fields for Solar and Factory Circuit.
- [x] 0.2 Cover requirement `Editor SHALL expose page-supported node alignment and icon treatment controls` by implementing node alignment, icon scale, spacing, and source-like icon preservation.
- [x] 0.3 Cover requirement `Unsupported flow treatment controls SHALL stay hidden and seed-backed` by adding page support metadata, hidden unsupported controls, validation, and seed fallback.
- [x] 0.4 Cover design decision `Use flow treatment tokens instead of arbitrary CSS` with named bounded connector and node treatment fields.
- [x] 0.5 Cover design decision `Keep the topology seed-owned` by preventing new graph topology, data rebinding, or arbitrary path creation.
- [x] 0.6 Cover design decision `Treat missing connector controls as editor gaps` by extending schema/inspector/runtime when FHD connector treatment cannot be represented.

## 1. Define flow treatment editor contract

- [x] 1.1 Extend the display page editor schema so supported Solar and Factory Circuit connector regions can declare FHD flow treatment fields with ranges, labels, reset defaults, and page support metadata; verify with `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`.
- [x] 1.2 Add or reuse shared config helpers so connector treatment tokens are stored separately from geometry, icon source, text content, and runtime data; verify with Solar and Factory Circuit page seed/config tests.

## 2. Wire inspector controls and preview/runtime rendering

- [x] 2.1 Add inspector controls for connector stroke width, opacity, line cap, radius/turn treatment, z-layer, node icon scale, icon-to-label spacing, and value alignment only where each page supports them; verify unsupported controls remain hidden.
- [x] 2.2 Apply persisted flow treatment tokens in editor preview and playback runtime for `Solar` and `FactoryCircuit`; verify with targeted render/config tests that draft preview and live playback consume the same values.

## 3. Protect source vocabulary and validation

- [x] 3.1 Add validation and seed fallback behavior for invalid or missing flow treatment tokens so previews never blank and publish blocks invalid values with region-level feedback; verify with editor validation and display-page publish tests.
- [x] 3.2 Add regression coverage that source-like icons remain page-owned and Factory Circuit load surfaces do not become management-style tables; verify with page render or vocabulary tests.
- [x] 3.3 Run targeted web tests covering inspector fields, runtime hydration, Solar config/render, and Factory Circuit config/render, then record a manual browser witness summary for connector/node treatment changes before marking the change complete.
