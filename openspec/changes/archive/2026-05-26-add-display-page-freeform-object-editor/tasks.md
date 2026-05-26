## 1. 編輯器整合

- [x] 1.1 Implement **Extend Display Pages Editor with an object layer list instead of a second editor** so **Display Pages Editor can add and select page freeform objects** creates and selects `line`, `asset-image`, and `icon-asset` items inside the existing page editor workflow, and verify with route-level editor coverage plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 [P] Implement **Treat freeform objects as generated authoring items alongside seed-backed regions** so **Page freeform object selections integrate with canvas and inspector editing** keeps object selections and region selections distinct but compatible in one editor state, and verify with selection or inspector tests plus `pnpm --filter @solar-display/web test`.

## 2. 物件列表與互動

- [x] 2.1 Implement **Make object list the authoritative picker for layer and visibility operations** so **Page freeform object authoring includes list-driven layer, lock, and visibility controls** supports reorder, lock, hide, delete, and stable selection for overlapping objects, and verify with object-list-focused tests plus `pnpm --filter @solar-display/web test`.
- [x] 2.2 Implement **Use asset-library-backed pickers for asset-image and icon-asset objects** so **Page freeform object authoring uses asset-library-backed pickers for asset objects** stores managed asset references through filtered asset selection instead of raw id input, and verify with picker or inspector coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.3 [P] Implement **Support duplication for repeated page accents and icons** so **Page freeform object authoring supports duplication** creates independently editable object copies with fresh IDs, and verify with object-list interaction coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.4 Implement **Constrain canvas interactions to freeform objects without destabilizing existing region editing** so **Page freeform object selections integrate with canvas and inspector editing** updates overlays and draft mutations for selected objects while preserving existing region editing behavior, and verify with canvas interaction coverage plus `pnpm --filter @solar-display/web test`.

## 3. 驗證

- [x] 3.1 Run `pnpm --filter @solar-display/web test` and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm the page freeform object editor integrates cleanly with the existing Display Pages Editor workflow.
- [x] 3.2 Run `spectra validate --strict --changes add-display-page-freeform-object-editor` to confirm the page freeform object authoring artifacts remain internally consistent.
