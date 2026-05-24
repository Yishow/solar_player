## 1. Review Checklist

- [ ] 1.1 Add a display surface visual review checklist covering hero typography, photo fade, card family, ornament consistency, live preview mode, FHD geometry, and distance readability.
- [ ] 1.2 Reference the checklist from display-surface OpenSpec changes that touch playback page visuals.
- [ ] 1.3 Document allowed exceptions for page-specific visual treatments that cannot use a shared primitive.

## 2. Contract Tests

- [ ] 2.1 Add or update tests confirming `LiveSlideshowPreviewCards` uses showcase mode while editor contexts keep default editor behavior.
- [ ] 2.2 Add or update tests confirming runtime page definitions expose renderers and seed configs for all five display pages.
- [ ] 2.3 Add or update tests confirming shared card primitives remain the expected path for metric/info card family adoption where already implemented.
- [ ] 2.4 Add lightweight assertions or fixtures for protected FHD geometry in seed configs/layout modules where practical.

## 3. CSS / Token Drift Checks

- [ ] 3.1 Add a lightweight test or documented review step that flags new raw color literals in shared display chrome roles unless explicitly justified.
- [ ] 3.2 Confirm display-only semantic tokens are used for title, emphasis, card surface, photo fade, and ornament roles after chrome alignment changes.
- [ ] 3.3 Document exceptions for data URI SVGs, one-off masks, and gradients that cannot be tokenized cleanly.

## 4. Validation

- [ ] 4.1 Run `pnpm --filter @solar-display/web test`.
- [ ] 4.2 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [ ] 4.3 Manually review `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`, and `/slideshow-preview` with the checklist.
- [ ] 4.4 Run `spectra validate --strict --changes add-display-surface-visual-guardrails`.
