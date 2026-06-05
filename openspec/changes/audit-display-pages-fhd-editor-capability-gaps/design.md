## Context

這個 change 是四個 FHD editor/tooling change 的前置盤點，不直接修改頁面 UI。現況掃描顯示 editor 已經不是只有 geometry：

- `apps/web/src/pages/DisplayPagesEditor/index.tsx` 透過 `resolvePageRegionSchemas(selectedPage.templateKey)` 取得當前可編輯 surface。
- `apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts` 把五頁 template 對應到各頁 `*DisplayPageEditorRegions`。
- `packages/shared/src/displayEditorSchema.ts` 已支援 text、number、toggle、select、asset、array、constraints、visibleWhen、geometry、mediaEffectSurface、presetKey。
- `apps/web/src/pages/shared/displayCardStyleConfig.ts` 已支援 card title/subtitle/value/unit font size、padding、corner radius、header gap、icon box size、footer padding、value margin、value row align。
- `apps/web/src/pages/shared/displayPageChromeConfig.ts` 已支援 hero typography、gold line、leaf ornament、counter、arrow、period chips、provenance、status block chrome fields。
- `apps/web/src/pages/shared/displayPageMediaEffectConfig.ts` 與 `DisplayPageMediaEffectInspector` 已支援部分 media effect surface：fade、mist、blur、opacity layers。

因此 ledger 必須分清楚：缺的是完全沒有 editor capability、已有 helper 但頁面未 expose、已有 editor control 但未確認是否滿足 FHD reference、或其實只需要數值調整。

## Goals / Non-Goals

**Goals:**

- 產出一份可交接的 `docs/fhd-editor-gap-ledger.md`。
- 逐頁列出 FHD reference、現有 runtime surface、現有 editor region、現有 field group、缺口、缺口分類、下游 change。
- 明確標示哪些缺口已由現有 editor control 覆蓋，後續只需調值與 witness。
- 明確標示哪些缺口需要新增 editor capability，並綁到四個已 park change 或另開 change。
- 保護 `/display-pages/editor` capability-first 原則：editor 不足時先補 editor，不把 page-local CSS-only 當成完成。

**Non-Goals:**

- 不新增 typography、ornament、flow connector 或 witness tooling runtime code。
- 不用 audit ledger 取代 Spectra change artifacts。
- 不把 `docs/reference-match/` 帶回正式 workflow。
- 不把 prototype prompt、prototype CSS 或舊 HTML 當成現行 source of truth。

## Current-State Baseline To Record

Ledger SHALL include this code-confirmed baseline before assigning gaps:

| Page | Active reference | Current editor regions and field groups to verify |
| --- | --- | --- |
| `Overview` | `docs/reference/FHD/01-1.Overview (大).png` | `overviewDisplayPageEditorRegions`: hero copy geometry and hero typography; hero media source, placement, and supported media effects; summary card style; hero container geometry; gold line; leaf ornament; KPI geometry, card style, and icon source. |
| `Solar` | `docs/reference/FHD/02-2.Solar (大).png` | `solarDisplayPageEditorRegions`: hero copy and hero typography; hero media source and placement; hero media effect currently marked unsupported; gold line; leaf ornament; flow node geometry and icon source; connector geometry; KPI geometry, card style, and icon source. |
| `FactoryCircuit` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `factoryCircuitDisplayPageEditorRegions`: hero copy and hero typography; copy/status geometry; status block chrome; gold line; leaf ornament; node geometry and icon source; connector geometry; load panel geometry; load row geometry and icon source; KPI geometry and icon source. |
| `Images` | `docs/reference/FHD/04-4.Images (大).png` | `imagesDisplayPageEditorRegions`: hero copy and hero typography; copy layout; gold ornament; counter chrome; arrow chrome; main stage source, placement, geometry, and supported media effects; info panel geometry, card style, and icon source; arrow geometry; thumbnail slot geometry. |
| `Sustainability` | `docs/reference/FHD/05-5.Sustainability (大).png` | `sustainabilityDisplayPageEditorRegions`: hero copy and hero typography; hero media source, placement, and geometry; hero media effect currently marked unsupported; highlight rail and card-rail child authoring; leaf ornament; period chips; provenance; KPI/stat geometry, card style, and icon source. |

Ledger SHALL also record that `buildOverviewRegions`, `buildSolarRegions`, `buildFactoryCircuitRegions`, `buildImagesRegions`, and `buildSustainabilityRegions` currently appear only as local functions in `apps/web/src/pages/DisplayPagesEditor/runtime*.tsx`; they are not the authoritative editor region source unless implementation proves otherwise.

## Ledger Classification

Each ledger row SHALL use exactly one of these classifications:

- `existing-editor-control`: The needed FHD adjustment is already represented by current editor schema and runtime rendering. The next action is tune values and capture witness evidence.
- `new-editor-capability`: The adjustment cannot be represented by current editor controls. The next action is implement editor schema, inspector, persistence, preview/runtime consumption, validation, and tests.
- `non-editor-runtime-gap`: The adjustment belongs to runtime data, asset pipeline, route behavior, or playback model rather than editor controls.
- `accepted-difference`: The user accepts the difference from the FHD reference; the row must record the reason and acceptance date.

Rows SHALL NOT use vague statuses such as `todo`, `unknown`, or `needs polish` without one of the four classifications.

## Downstream Change Mapping

The ledger SHALL map editor gaps to downstream work:

- Typography, line-height, card rhythm, caption rhythm, dense row rhythm: `add-display-editor-fhd-typography-rhythm-controls`.
- Media effect, media crop/focus/framing, leaf/gold/ornament treatment, missing Sustainability ring-like ornament surface if confirmed: `add-display-editor-fhd-ornament-media-controls`.
- Solar/Factory connector stroke, line cap, connector opacity, flow node treatment, icon scale/spacing beyond icon source selection: `add-display-editor-fhd-flow-connector-controls`.
- Screenshot evidence, route/reference pairing, AI-led witness bundle, editor capability classification workflow: `add-ai-led-fhd-witness-tooling`.
- Runtime data, asset governance, route behavior, or page model gaps: `new-change-required:<proposed-name>`.

## Implementation Contract

- **Behavior**: After this change, a contributor can open `docs/fhd-editor-gap-ledger.md` and determine which FHD gaps are already editor-backed, which require editor work, which are non-editor product/runtime work, and which differences are accepted.
- **Data shape**: The ledger SHALL be markdown with a stable table per page. Each row SHALL include page, route, FHD reference path, surface, current editor region id, current editor field group, current evidence path or code anchor, classification, downstream owner, next verification, and notes.
- **Evidence source**: The audit SHALL cite current repo files and optional screenshots. It SHALL not cite `docs/reference-match/` as workflow input.
- **Failure modes**: If a page surface cannot be classified from code, the row SHALL be `new-editor-capability` or `non-editor-runtime-gap` only after naming the missing code evidence. It SHALL not be left blank.
- **Acceptance criteria**:
  - All five playback pages have at least one complete ledger table.
  - All rows use one of the four classifications.
  - Every `new-editor-capability` row maps to one of the four downstream changes or a proposed new change.
  - Ledger includes code-confirmed existing coverage from page region schemas, not only screenshots or visual impressions.
  - A test or deterministic check prevents `docs/reference-match/` from appearing in the ledger.

## Risks / Trade-offs

- [Risk] The ledger can become stale after editor changes. Mitigation: downstream change completion must update affected rows from `new-editor-capability` to `existing-editor-control` or `accepted-difference`.
- [Risk] Too much detail can slow implementation. Mitigation: keep the ledger page-scoped and field-group scoped; do not list every repeated KPI card as a separate row unless the gap differs per card.
- [Risk] Audit can become a visual review without code grounding. Mitigation: every row must include a code anchor or screenshot evidence path.
