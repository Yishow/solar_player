## 1. Review Checklist

- [x] 1.1 Provide a display surface visual review checklist covering hero typography, photo fade, card family, ornament consistency, live preview mode, FHD geometry, and distance readability.
- [x] 1.2 Reference the checklist from display-surface OpenSpec changes that touch playback page visuals.
- [x] 1.3 Document allowed exceptions for page-specific visual treatments that cannot use a shared primitive.

## 2. Contract Tests

- [x] 2.1 Add or update tests confirming `LiveSlideshowPreviewCards` uses showcase mode while editor contexts keep default editor behavior.
- [x] 2.2 Guard shared primitive adoption with lightweight tests or assertions by confirming runtime page definitions expose renderers and seed configs for all five display pages.
- [x] 2.3 Guard shared primitive adoption with lightweight tests or assertions by confirming shared card primitives remain the expected path for metric/info card family adoption where already implemented.
- [x] 2.4 Protect FHD geometry from accidental style refactors by adding lightweight assertions or fixtures for protected seed config/layout geometry where practical.

## 3. CSS / Token Drift Checks

- [x] 3.1 Guard semantic token usage for shared display chrome roles with a lightweight test or documented review step that flags new raw color literals unless explicitly justified.
- [x] 3.2 Confirm display-only semantic tokens are used for title, emphasis, card surface, photo fade, and ornament roles after chrome alignment changes.
- [x] 3.3 Document exceptions for data URI SVGs, one-off masks, and gradients that cannot be tokenized cleanly.

## 4. Validation

- [x] 4.1 Run `pnpm --filter @solar-display/web test`.
- [x] 4.2 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [x] 4.3 Manually review `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`, and `/slideshow-preview` with the checklist.
- [x] 4.4 Run `spectra validate --strict --changes add-display-surface-visual-guardrails`.
