## 1. Preview Mode Contract

- [ ] 1.1 Add a typed `mode` contract to `LiveDisplayPagePreview`, with `editor` as the default and `showcase` as the slideshow miniature mode.
- [ ] 1.2 Keep existing `LiveDisplayPagePreviewState` status handling unchanged so loading, unpublished, renderer-unavailable, config-unavailable, runtime-unavailable, and asset-unavailable states remain supported.
- [ ] 1.3 Add tests that confirm omitted mode preserves current editor-style behavior.

## 2. Showcase Presentation

- [ ] 2.1 Implement showcase-mode wrapper styles that remove or substantially weaken the read-only badge, heavy border, and technical management chrome.
- [ ] 2.2 Implement display-friendly showcase fallback copy and styling for non-ready states.
- [ ] 2.3 Ensure showcase fallback still maintains card dimensions and does not collapse carousel layout.

## 3. SlideshowPreview Adoption

- [ ] 3.1 Update `LiveSlideshowPreviewCards` to pass showcase mode to `LiveDisplayPagePreview`.
- [ ] 3.2 Confirm `preview.css` card frame and live preview wrapper do not double-border or visually fight each other in showcase mode.
- [ ] 3.3 Keep status rail, timeline dots, active-card glow, summary debug, and rotation diagnostics unchanged.

## 4. Validation

- [ ] 4.1 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [ ] 4.2 Run targeted tests for `LiveDisplayPagePreview` mode behavior and `LiveSlideshowPreviewCards` mode adoption.
- [ ] 4.3 Manually review `/slideshow-preview` against the prototype style: carousel cards should feel like display miniatures, not nested editor widgets.
- [ ] 4.4 Run `spectra validate --strict --changes split-live-display-preview-showcase-mode`.
