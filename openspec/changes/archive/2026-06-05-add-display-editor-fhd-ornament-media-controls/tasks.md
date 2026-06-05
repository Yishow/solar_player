## 0. Coverage map

- [x] 0.1 Cover requirement `Editor SHALL expose FHD media treatment controls without changing media sources` by implementing editor-backed fade, crop, focus, framing, and mask fields that preserve the resolved media source.
- [x] 0.2 Cover requirement `Editor SHALL expose page-supported ornament treatment controls` by implementing renderer-backed leaf, ring, gold-line, glow, and ornament treatment fields only where supported.
- [x] 0.3 Cover requirement `Invalid treatment values SHALL fall back safely` by adding validation, seed fallback, and publish blocking for invalid treatment values.
- [x] 0.4 Cover design decision `Separate media treatment from media source` by storing treatment fields separately from media source, playlist, and managed asset references.
- [x] 0.5 Cover design decision `Keep ornament controls page-supported and renderer-backed` with per-page/per-ornament field visibility.
- [x] 0.6 Cover design decision `Preserve display layering` with constrained opacity and z-layer handling that protects display readability.

## 1. Define FHD treatment schema

- [x] 1.1 Add editor schema support for media treatment fields such as fade opacity, fade stop, mask softness, crop/focus/framing, and page-supported ornament fields such as opacity, scale, offset, thickness, overlap, and constrained z-layer; verify field visibility with inspector tests.
- [x] 1.2 Store media treatment and ornament treatment separately from media source, icon source, geometry, and story data in the five playback page seed configs; verify with page config tests.

## 2. Wire preview and playback rendering

- [x] 2.1 Apply persisted media treatment in preview/runtime for `Overview`, `Solar`, `Images`, and `Sustainability` without changing the resolved media source or active playlist image; verify with targeted page render/config tests.
- [x] 2.2 Apply persisted ornament treatment in preview/runtime for supported leaf, ring, gold-line, and glow surfaces on `Overview`, `Solar`, `FactoryCircuit`, and `Sustainability`; verify supported controls render and unsupported controls remain hidden.

## 3. Protect readability and fallback

- [x] 3.1 Add validation ranges and seed fallback for opacity, scale, crop/focus, fade, overlap, and layer values so invalid treatment never blanks preview or hides critical display content; verify with validation and publish tests.
- [x] 3.2 Run targeted web tests for inspector fields, media style, page configs, and affected page render output, then record a manual browser witness summary for media/ornament changes before marking the change complete.
