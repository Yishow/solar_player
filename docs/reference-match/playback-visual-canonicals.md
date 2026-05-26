# Playback Visual Canonicals

日期：2026-05-27

## Purpose

這份文件是 playback visual review 的 canonical witness ledger。每個頁面都必須同時對照：

- FHD image witness
- prototype/spec witness

review 不回答「好不好看」，而是回答「哪些 protected attributes 被保留，哪些被有意改動」。

## Witness Pair Ledger

| Route | FHD witness | Prototype/spec witness | Protected attributes | Preserved or changed | Documented exception |
| --- | --- | --- | --- | --- | --- |
| `/overview` | `docs/reference/FHD/01-1.Overview (大).png` | `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/01-overview-spec.md` | Hero hierarchy; Card-family rhythm; Photo fade; Ornament consistency; Source-like icon language; Absolute composition; Distance readability | Review each changed zone against the hero-first layout and five-card KPI rhythm. | `none` unless a page-specific blocker is recorded. |
| `/solar` | `docs/reference/FHD/02-2.Solar (大).png` | `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/02-solar-spec.md` | Hero hierarchy; source-like flow icon language; card-family rhythm; photo fade; absolute composition; distance readability | Preserve the left hero, right flow path, and bottom KPI cadence unless the change names the exact replacement. | `none` unless a page-specific blocker is recorded. |
| `/factory-circuit` | `docs/reference/FHD/03-3.Factory Circuit (大).png` | `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/03-factory-circuit-spec.md` | Hero hierarchy; source-like node icon language; load-panel rhythm; absolute composition; distance readability | Preserve diagram-first composition and keep the load panel subordinate to the playback story, not a CRUD board. | `none` unless a page-specific blocker is recorded. |
| `/images` | `docs/reference/FHD/04-4.Images (大).png` | `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/04-images-spec.md` | Hero hierarchy; photo fade; media-stage absolute composition; caption card rhythm; source-like icon language; distance readability | Preserve the main image stage, caption rail, and thumbnail strip as one display composition rather than stacked management cards. | `none` unless a page-specific blocker is recorded. |
| `/sustainability` | `docs/reference/FHD/05-5.Sustainability (大).png` | `docs/reference/kuozui-green-fhd-html-prototype/prompts/pages/05-sustainability-spec.md` | Hero hierarchy; ornament consistency; card-family rhythm; photo fade; absolute composition; distance readability | Preserve the hero-with-ring composition and bottom KPI/story rhythm rather than flattening it into a dashboard grid. | `none` unless a page-specific blocker is recorded. |

## Page Notes

### `/overview`

- `Protected attributes`
  - Hero hierarchy from eyebrow -> title -> lead -> hero image -> KPI row.
  - Card-family rhythm across the five KPI cards.
  - Photo fade and ornament consistency in the hero image edge treatment.
- `Preserved or changed`
  - Record whether title/KPI/media spacing preserved the witness order.
- `Documented exception`
  - Only if the page must deviate from the hero-first composition, and the reason is written.

### `/solar`

- `Protected attributes`
  - Hero hierarchy that leaves the flow diagram and KPI row readable from distance.
  - Source-like icon language for flow nodes and KPI glyphs.
  - Absolute composition between hero, flow connectors, and KPI cards.
- `Preserved or changed`
  - Record whether node/connector placement stayed witness-like or was intentionally rerouted.
- `Documented exception`
  - Required before replacing any flow region with dashboard or toolbar treatment.

### `/factory-circuit`

- `Protected attributes`
  - Diagram-first storytelling over table-first control grouping.
  - Load-panel rhythm that supports, but does not replace, the main circuit story.
  - Distance readability for node labels, loads, and KPI band.
- `Preserved or changed`
  - Record whether the flow diagram remained the first-read element.
- `Documented exception`
  - Required before promoting management-style tables or boards into the main focus region.

### `/images`

- `Protected attributes`
  - Main media stage and caption rail as the first-read composition.
  - Photo fade and source-like icon language around media controls.
  - Thumbnail strip rhythm under the stage.
- `Preserved or changed`
  - Record whether the stage, caption, and thumbnail cadence stayed tied to the witness.
- `Documented exception`
  - Required before converting the page into a stacked gallery admin layout.

### `/sustainability`

- `Protected attributes`
  - Hero hierarchy led by title, hero media, and ring ornament treatment.
  - Card-family rhythm across KPI/stat rails.
  - Absolute composition and distance readability across the lower storytelling band.
- `Preserved or changed`
  - Record whether the hero/ring/KPI relationship stayed witness-like.
- `Documented exception`
  - Required before flattening the hero/ring composition into generic dashboard sections.
