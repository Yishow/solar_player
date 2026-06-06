## 1. Artifact and scope repair

- [x] 1.1 Create missing design/spec/tasks artifacts from the existing proposal, explicitly separating already-present controls from missing implementation work.

## 2. Tests first

- [x] 2.1 Add failing targeted tests for shared chrome config defaults/fields: copy typography, Sustainability palette, and leaf rotation.
- [x] 2.2 Add failing Sustainability config/runtime tests for palette fields, copy typography fields, and config-backed leaf rotation.
- [x] 2.3 Add failing Factory Circuit config/runtime tests for copy typography fields, KPI card style fields, and leaf opacity matching config.
- [x] 2.4 Add failing Images config/runtime tests for lead copy typography fields.

## 3. Shared config helpers

- [x] 3.1 Reuse small shared config helpers: extend shared display chrome config with copy typography, Sustainability green palette tokens are editor-backed helpers, and leaf rotation helpers with seed-backed fallback behavior.

## 4. Page config and editor regions

- [x] 4.1 Preserve existing visual defaults while wiring Sustainability `chrome.palette`, `chrome.copyTypography`, and leaf rotation seed/editor fields for requirements "Playback copy typography controls are editor-backed" and "Sustainability green palette tokens are editor-backed".
- [x] 4.2 Reuse existing card style controls for Factory KPIs while wiring Factory `chrome.copyTypography`, leaf rotation seed/editor field, and KPI `cardStyles` editor fields for requirements "Playback copy typography controls are editor-backed" and "Factory KPI card typography is editor-backed".
- [x] 4.3 Preserve existing visual defaults while wiring Images `chrome.copyTypography` seed/editor fields for requirement "Playback copy typography controls are editor-backed".

## 5. Runtime rendering

- [x] 5.1 Apply resolved copy typography and Sustainability palette values in playback runtime/CSS for requirements "Playback copy typography controls are editor-backed" and "Sustainability green palette tokens are editor-backed".
- [x] 5.2 Apply Factory KPI card styles through `DisplayCardFrame`/`DisplayCardValueRow` for requirement "Factory KPI card typography is editor-backed".
- [x] 5.3 Fix leaf bindings directly: Factory leaf opacity uses configured opacity directly and Sustainability leaf rotation uses CSS variable for requirement "Leaf ornament opacity and rotation bindings match config".

## 6. Verification

- [x] 6.1 Run targeted web tests for the touched pages and shared chrome config.
- [x] 6.2 Run `spectra analyze extend-typography-palette-and-fix-ornament-bindings --json` and `spectra validate --strict --changes extend-typography-palette-and-fix-ornament-bindings`.
- [x] 6.3 Run `pnpm run build`, `pnpm test`, and `graphify update .`.
