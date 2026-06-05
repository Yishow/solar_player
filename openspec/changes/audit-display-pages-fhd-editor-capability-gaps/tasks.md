## 0. Coverage map

- [x] 0.1 Cover requirement `FHD editor ledger SHALL record current editor coverage for the five playback pages` by creating the five-page ledger with code-confirmed current editor coverage.
- [x] 0.2 Cover requirement `Ledger SHALL classify every FHD gap by implementation path` by requiring exactly four classifications and downstream owner mapping for every gap row.
- [x] 0.3 Cover requirement `Ledger SHALL use current repo sources and avoid deprecated workflow inputs` by grounding audit rows in current page region schemas and blocking `docs/reference-match/`.
- [x] 0.4 Cover requirement `Ledger SHALL gate downstream FHD editor changes` by mapping rows to the four parked FHD changes or to proposed new changes.

## 1. Confirm active editor source model

- [x] 1.1 Verify `apps/web/src/pages/DisplayPagesEditor/index.tsx` resolves editable regions from `resolvePageRegionSchemas(selectedPage.templateKey)` and record this as the ledger source-of-truth rule.
- [x] 1.2 Verify `apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts` maps the five playback templates to `overviewDisplayPageEditorRegions`, `solarDisplayPageEditorRegions`, `factoryCircuitDisplayPageEditorRegions`, `imagesDisplayPageEditorRegions`, and `sustainabilityDisplayPageEditorRegions`.
- [x] 1.3 Verify local `buildOverviewRegions`, `buildSolarRegions`, `buildFactoryCircuitRegions`, `buildImagesRegions`, and `buildSustainabilityRegions` in `runtime*.tsx` are not used as authoritative editor region sources unless code tracing proves otherwise; record the outcome in the ledger notes.

## 2. Build page-level FHD editor coverage ledger

- [x] [P] 2.1 Audit `Overview` against `docs/reference/FHD/01-1.Overview (大).png`; record existing hero typography, hero media source/placement/effects, summary card style, hero container geometry, gold line, leaf ornament, KPI geometry/card-style/icon-source, and remaining FHD gaps.
- [x] [P] 2.2 Audit `Solar` against `docs/reference/FHD/02-2.Solar (大).png`; record existing hero typography, hero media source/placement, unsupported media effect status, gold line, leaf ornament, flow node geometry/icon-source, connector geometry, KPI geometry/card-style/icon-source, and remaining FHD gaps.
- [x] [P] 2.3 Audit `FactoryCircuit` against `docs/reference/FHD/03-3.Factory Circuit (大).png`; record existing hero typography, copy/status geometry, status block chrome, gold line, leaf ornament, node geometry/icon-source, connector geometry, load panel geometry, load row geometry/icon-source, KPI geometry/icon-source, and remaining FHD gaps.
- [x] [P] 2.4 Audit `Images` against `docs/reference/FHD/04-4.Images (大).png`; record existing hero typography, copy layout, gold ornament, counter chrome, arrow chrome, main stage source/placement/geometry/effects, info panel geometry/card-style/icon-source, arrow geometry, thumbnail slot geometry, and remaining FHD gaps.
- [x] [P] 2.5 Audit `Sustainability` against `docs/reference/FHD/05-5.Sustainability (大).png`; record existing hero typography, hero media source/placement/geometry, unsupported media effect status, highlight rail/card-rail child authoring, leaf ornament, period chips, provenance, KPI/stat geometry/card-style/icon-source, and remaining FHD gaps.

## 3. Classify gaps and map downstream ownership

- [x] 3.1 Create `docs/fhd-editor-gap-ledger.md` with a stable table per page containing page, route, FHD reference path, surface, current editor region id, current editor field group, code anchor or evidence path, classification, downstream owner, next verification, and notes.
- [x] 3.2 Classify every row as exactly one of `existing-editor-control`, `new-editor-capability`, `non-editor-runtime-gap`, or `accepted-difference`; reject rows with blank status, `todo`, `unknown`, or `needs polish`.
- [x] 3.3 Map every `new-editor-capability` row to `add-display-editor-fhd-typography-rhythm-controls`, `add-display-editor-fhd-ornament-media-controls`, `add-display-editor-fhd-flow-connector-controls`, `add-ai-led-fhd-witness-tooling`, or `new-change-required:<proposed-name>`.
- [x] 3.4 Mark existing controls that only require value tuning as `existing-editor-control` so downstream work does not duplicate already implemented schema helpers or region fields.

## 4. Verify ledger quality and handoff

- [x] 4.1 Add `apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts` or an equivalent deterministic check that verifies the ledger references all five `docs/reference/FHD/` images, includes all four classifications, includes the four parked downstream change names, and does not include `docs/reference-match/`.
- [x] 4.2 Run the affected web test command for the ledger check, then run `spectra analyze audit-display-pages-fhd-editor-capability-gaps --json` and `spectra validate audit-display-pages-fhd-editor-capability-gaps`.
- [x] 4.3 Update the four parked downstream change handoff notes only if the ledger identifies a missing owner; do not apply or implement those downstream changes in this audit change.
