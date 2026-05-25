## 1. Snap Foundations

- [x] 1.1 Implement **Use explicit snap targets instead of implicit nearest-neighbor heuristics** so the canvas satisfies **Snap editable regions to guides, region edges, and center lines**, and verify with guide, edge, center, and center-line cases in `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts` plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 Implement snap toggles and canvas feedback so operators can see when **Snap editable regions to guides, region edges, and center lines** is active, and verify with route/render assertions in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`.

## 2. Locked Spacing

- [x] 2.1 Implement **Scope distance lock to active interaction sessions** so drag and resize operations satisfy **Maintain temporary distance locks during active geometry edits**, and verify with session-scoped lock cases and boundary-clamp conflicts in `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts`.

## 3. Multi-Select Alignment

- [x] 3.1 Implement multi-select state and **Define multi-select alignment around a stable bounding selection box** so the editor satisfies **Align and distribute multiple selected regions**, and verify with align-command cases in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` and geometry assertions in `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts`.
- [ ] 3.2 Implement distribute actions and **Surface snap and alignment feedback on the canvas, not only in menus** so operators can trust **Align and distribute multiple selected regions**, and verify with equal-gap cases in tests plus one manual multi-card alignment check.

## 4. Verification

- [x] 4.1 Add regression coverage for **Snap editable regions to guides, region edges, and center lines**, **Maintain temporary distance locks during active geometry edits**, and **Align and distribute multiple selected regions**, then verify with `pnpm --filter @solar-display/web test`, `spectra analyze add-display-editor-alignment-and-snap-toolkit --json`, and `spectra validate add-display-editor-alignment-and-snap-toolkit`.
