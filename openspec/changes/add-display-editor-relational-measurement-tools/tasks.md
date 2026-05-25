## 1. Relational Measurement State

- [x] 1.1 Implement **Resolve relational measurements from editor-known geometry only** so the editor can compute **Measure distances between any two editable regions** in design-space units without reading DOM layout, and verify with new cases in `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts` plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 Implement **Model temporary measure mode separately from primary selection** so the canvas can satisfy **Provide a temporary measurement mode that does not replace primary selection**, and verify with interaction assertions in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` and `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`.

## 2. Editable Rulers

- [x] 2.1 Implement **Make measurement handles mutate only the selected region** so dragging a relational ruler fulfills **Let measurement handles adjust the selected region geometry** while leaving the reference region fixed, and verify with geometry-update cases in `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts` and route-level coverage in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`.
- [x] 2.2 Implement handle disabled states for unselected or geometry-missing interactions so **Let measurement handles adjust the selected region geometry** never mutates the wrong region, and verify with no-selection and missing-geometry cases in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`.

## 3. Label Readability And Verification

- [x] 3.1 Implement **Avoid label occlusion with priority and fallback placement** so crowded rulers satisfy **Keep measurement labels readable when the canvas is crowded**, and verify with render assertions in `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` plus a manual crowded-page check.
- [x] 3.2 Add regression coverage for **Measure distances between any two editable regions**, **Provide a temporary measurement mode that does not replace primary selection**, and **Keep measurement labels readable when the canvas is crowded**, then verify with `pnpm --filter @solar-display/web test`, `spectra analyze add-display-editor-relational-measurement-tools --json`, and `spectra validate add-display-editor-relational-measurement-tools`.
