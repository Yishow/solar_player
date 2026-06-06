## 1. Artifact and current-state repair

- [x] 1.1 Create missing design/spec/tasks artifacts from the existing proposal, explicitly marking ring thickness/glow as already-present wiring to verify rather than duplicate.

## 2. Tests first

- [x] 2.1 Add failing shared media effect tests for requirement "Media tone effects are editor-backed" and design decision "Extend the existing media effect layer model": `tone` support, saturation/contrast filter composition, inspector authoring, and summary output.
- [x] 2.2 Add failing shared chrome config tests for requirement "Ornament base geometry is editor-backed" and design decision "Keep ornament base layout in chrome config": gold line base layout/rotation fields and leaf base layout fields.
- [x] 2.3 Add failing Solar config/runtime tests proving gold line and leaf base geometry/rotation come from resolved config.
- [x] 2.4 Add failing Sustainability config/runtime tests proving leaf base geometry is seed-backed and requirement "Existing ring treatment remains wired" remains true for ring thickness/glow.
- [x] 2.5 Add failing Images config/runtime tests for requirement "Images stage and thumbnail framing are editor-backed" and design decision "Keep Images framing in a page chrome module": stage framing and thumbnail radius are config-backed and `isReferenceHeroCrop` no longer drives full-bleed behavior.

## 3. Shared helpers

- [x] 3.1 Implement requirement "Media tone effects are editor-backed" by extending shared media effect types/resolver/style/authoring/inspector with full-frame tone saturation and contrast controls.
- [x] 3.2 Implement requirement "Ornament base geometry is editor-backed" by extending shared display chrome helpers with seed-backed gold line base layout/rotation and leaf base layout fields.
- [x] 3.3 Implement requirement "Images stage and thumbnail framing are editor-backed" by adding Images stage/thumbnail framing config helpers with bounded defaults and editor fields.

## 4. Page config and editor regions

- [x] 4.1 Wire Solar seed/editor config for gold line base geometry/rotation and leaf base geometry without changing current defaults.
- [x] 4.2 Wire Sustainability seed/editor config for leaf base geometry and verify requirement "Existing ring treatment remains wired" by keeping existing ring thickness/glow fields exposed.
- [x] 4.3 Wire Images seed/editor config for main stage full-bleed/radius/shadow and thumbnail radius without changing current defaults for requirement "Images stage and thumbnail framing are editor-backed".

## 5. Runtime rendering

- [x] 5.1 Apply media tone filters through `buildDisplayPageMediaPresentation` while preserving blur and opacity composition.
- [x] 5.2 Apply Solar gold line and leaf base geometry/rotation from resolved config with seed-backed partial config fallback.
- [x] 5.3 Apply Sustainability leaf base geometry from resolved config with seed-backed partial config fallback.
- [x] 5.4 Apply Images stage and thumbnail framing from resolved config and remove `isReferenceHeroCrop` as the framing decision source.

## 6. Verification

- [x] 6.1 Run targeted shared/web tests for media effects, shared chrome config, Solar, Sustainability, Images, and DisplayPagesEditor inspector behavior.
- [x] 6.2 Run `spectra analyze extend-display-editor-ornament-and-media-controls --json` and `spectra validate --strict --changes extend-display-editor-ornament-and-media-controls`.
- [x] 6.3 Run `pnpm run build`, `pnpm test`, and `graphify update .`.
