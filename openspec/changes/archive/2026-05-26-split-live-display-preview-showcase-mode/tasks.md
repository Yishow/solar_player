## 1. Preview Mode Contract

- [x] 1.1 Support editor and showcase presentation modes for `LiveDisplayPagePreview` by adding a typed `mode` contract, with `editor` as the default and `showcase` as the slideshow miniature mode.
- [x] 1.2 Keep existing `LiveDisplayPagePreviewState` status handling unchanged so loading, unpublished, renderer-unavailable, config-unavailable, runtime-unavailable, and asset-unavailable states remain supported.
- [x] 1.3 Add tests that confirm omitted mode preserves current editor-style behavior.

## 2. Showcase Presentation

- [x] 2.1 Implement showcase-mode wrapper styles that remove or substantially weaken the read-only badge, heavy border, and technical management chrome.
- [x] 2.2 Keep fallback states safe in both modes by implementing display-friendly showcase fallback copy and styling for non-ready states.
- [x] 2.3 Ensure showcase fallback still maintains card dimensions and does not collapse carousel layout.

## 3. SlideshowPreview Adoption

- [x] 3.1 Ensure slideshow preview cards use showcase mode by updating `LiveSlideshowPreviewCards` to pass showcase mode to `LiveDisplayPagePreview`.
- [x] 3.2 Confirm `preview.css` card frame and live preview wrapper do not double-border or visually fight each other in showcase mode.
- [x] 3.3 Keep status rail, timeline dots, active-card glow, summary debug, and rotation diagnostics unchanged.

## 4. Validation

- [x] 4.1 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [x] 4.2 Run targeted tests for `LiveDisplayPagePreview` mode behavior and `LiveSlideshowPreviewCards` mode adoption.
- [x] 4.3 Manually review `/slideshow-preview` against the prototype style: carousel cards should feel like display miniatures, not nested editor widgets.
- [x] 4.4 Run `spectra validate --strict --changes split-live-display-preview-showcase-mode`.
