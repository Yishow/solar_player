## 1. Keyboard Productivity

- [x] 1.1 Implement **Extend keyboard nudge with explicit step tiers** so the editor satisfies **Support zoom, pan, and keyboard nudge during canvas editing** with fine, normal, and accelerated movement, and verify with new tiered nudge cases in `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts` plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 Implement visible shortcut guidance and history-safe nudge updates so **Support zoom, pan, and keyboard nudge during canvas editing** remains undoable and predictable, and verify with route-level assertions in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`.

## 2. Geometry Reuse

- [x] 2.1 Implement **Keep geometry reuse grounded in compatibility keys** so compatible targets, rejection states, and success states satisfy **Reuse layout adjustments within an editor session**, and verify with compatibility cases in `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` or a dedicated reuse test.
- [x] 2.2 Implement **Treat partial paste as named geometry subsets** so operators can paste `position`, `size`, or `full-frame` subsets while satisfying **Reuse layout adjustments within an editor session**, and verify with partial-paste cases in new or updated web tests.
- [x] 2.3 Implement batch paste and **Keep productivity actions inside the existing draft history contract** so multiple compatible targets can receive copied geometry while preserving undo/redo behavior for **Reuse layout adjustments within an editor session**, and verify with batch history assertions in tests plus `pnpm --filter @solar-display/web test`.

## 3. Verification

- [x] 3.1 Add regression coverage for **Support zoom, pan, and keyboard nudge during canvas editing** and **Reuse layout adjustments within an editor session**, then verify with `pnpm --filter @solar-display/web test`, `spectra analyze extend-display-editor-layout-reuse-productivity --json`, and `spectra validate extend-display-editor-layout-reuse-productivity`.
