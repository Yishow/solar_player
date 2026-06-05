## 0. Coverage map

- [x] 0.1 Cover requirement `Editor SHALL expose FHD typography controls for playback hero and caption regions` by implementing editor-backed hero/caption fields with preview and playback parity.
- [x] 0.2 Cover requirement `Editor SHALL expose FHD rhythm controls for playback cards and dense display rows` by implementing editor-backed card, KPI, stat, highlight, and load-row rhythm fields.
- [x] 0.3 Cover requirement `Unsupported FHD rhythm controls SHALL stay hidden and seed-backed` by adding page support metadata, hidden unsupported controls, validation, and seed fallback.
- [x] 0.4 Cover design decision `Use a narrow FHD rhythm token group instead of raw CSS fields` with named bounded token fields.
- [x] 0.5 Cover design decision `Keep region support page-specific` with per-page/per-region field visibility.
- [x] 0.6 Cover design decision `Treat missing controls as editor capability gaps` by extending schema/inspector/runtime when FHD rhythm cannot be represented.

## 1. Define FHD typography and rhythm editor contract

- [x] 1.1 Extend the display page editor schema so supported hero, caption, KPI/card, stat-card, and load-row regions can declare FHD typography/rhythm fields with ranges, labels, reset defaults, and page support metadata; verify with `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`.
- [x] 1.2 Add or reuse shared config helpers so typography/rhythm tokens are stored separately from geometry, media source, icon source, and story data; verify with page seed/config tests for all five playback pages.

## 2. Wire inspector controls and preview/runtime rendering

- [x] 2.1 Add inspector controls for hero line-height, eyebrow spacing, lead copy size, caption typography, KPI/card height, card padding, value-row gap, footer spacing, and dense row rhythm only where each page supports them; verify unsupported controls remain hidden.
- [x] 2.2 Apply persisted typography/rhythm tokens in editor preview and playback runtime for `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability`; verify with targeted render/config tests that draft preview and live playback consume the same values.

## 3. Protect fallback, validation, and FHD handoff

- [x] 3.1 Add validation and seed fallback behavior for invalid or missing typography/rhythm tokens so previews never blank and publish blocks invalid values with region-level feedback; verify with editor validation and display-page publish tests.
- [x] 3.2 Run targeted web tests covering inspector fields, five page configs, runtime hydration, and representative page render output, then record a manual browser witness summary for the typography/rhythm changes before marking the change complete.
