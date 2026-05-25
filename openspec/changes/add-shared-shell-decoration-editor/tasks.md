## 1. Shell editor surface

- [x] 1.1 Implement **Reuse editor canvas primitives on a dedicated shell authoring surface** so **Provide a dedicated authoring surface for shared shell decoration objects** loads and previews the shared shell draft without requiring a display page selection, and verify with route-level editor coverage plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 [P] Implement **Model shell objects as header/footer scoped list items instead of page regions** so **Shared shell decoration authoring includes object list selection and ordering controls** exposes grouped object rows for `header` and `footer`, and verify with object-list-focused tests plus `pnpm --filter @solar-display/web test`.

## 2. Authoring controls

- [x] 2.1 Implement **Keep object list as the primary selection surface for crowded shell decorations** so **Shared shell decoration authoring includes object list selection and ordering controls** supports select, delete, visibility, lock, and z-order actions with stable preview selection, and verify with interaction coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.2 Implement **Expose geometry editing and asset picking without raw payload editing** so **Shared shell decoration authoring edits geometry and asset sources through typed controls** supports bounded line geometry fields and asset-library-backed picking for shell-scoped assets, and verify with inspector or picker coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.3 [P] Implement **Support duplication for repeated shell ornaments and lines** so **Shared shell decoration authoring supports object duplication** creates independently editable copies with fresh IDs and predictable z-order, and verify with object-list interaction coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.4 Implement **Draft and publish shared shell decorations independently from display pages** so **Shared shell decoration authoring publishes independently from display pages** saves and publishes shell config without mutating any display page draft, and verify with save or publish workflow tests plus `pnpm --filter @solar-display/web test`.

## 3. 驗證

- [x] 3.1 Run `pnpm --filter @solar-display/web test` and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm the shared shell editor surface and authoring controls compile and pass their targeted coverage.
- [x] 3.2 Run `spectra validate --strict --changes add-shared-shell-decoration-editor` to confirm the shared shell authoring artifacts remain internally consistent.
