## 1. Semantic Token Foundation

- [ ] 1.1 Add display surface semantic tokens to `apps/web/src/styles/tokens.css` for hero title ink, eyebrow green, emphasis green/gold, card surface, card soft border, photo fade paper, ornament stroke/fill, and soft display shadows.
- [ ] 1.2 Update shared display chrome config defaults so hero typography and ornament defaults match the prototype family and consume semantic display roles where possible.
- [ ] 1.3 Document which token roles are display-only and which remain global shell/brand tokens.

## 2. Shared Chrome Primitives / Classes

- [ ] 2.1 Introduce shared hero typography primitives/classes for eyebrow, title, emphasized title segment, and subtitle.
- [ ] 2.2 Introduce a shared photo fade / media stage class or primitive that supports left, right, and bottom fades into the warm paper surface.
- [ ] 2.3 Introduce shared leaf and gold ornament primitives/classes that can be positioned by page-local layout/config while sharing the same visual vocabulary.

## 3. Playback Page Adoption

- [ ] 3.1 Migrate `Overview` common chrome styles to shared display tokens/primitives without moving existing hero copy, hero media, cards, leaf, or gold line geometry.
- [ ] 3.2 Migrate `Solar` common chrome styles to shared display tokens/primitives without changing flow node, connector, or KPI geometry.
- [ ] 3.3 Migrate `FactoryCircuit` title, copy, leaf, gold line, and shared surface colors to semantic tokens while leaving routing layout and load rows in place.
- [ ] 3.4 Migrate `Images` title, main-stage fade, info-card surface, arrows, thumbnails, and gold ornament colors to semantic tokens while preserving gallery composition.
- [ ] 3.5 Migrate `Sustainability` title, hero fade, highlight rail, KPI/stat surfaces, and leaf ornament colors to semantic tokens while preserving current card/content modes.

## 4. Validation

- [ ] 4.1 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [ ] 4.2 Run targeted tests for display chrome primitives/classes if added.
- [ ] 4.3 Manually compare `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability` against the prototype family for hero typography, photo fade, ornament consistency, and unchanged FHD geometry.
- [ ] 4.4 Run `spectra validate --strict --changes normalize-display-surface-chrome-tokens`.
