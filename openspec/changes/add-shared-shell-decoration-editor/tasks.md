## 1. Shell editor surface

- [ ] 1.1 Implement **Reuse editor canvas primitives on a dedicated shell authoring surface** so **Provide a dedicated authoring surface for shared shell decoration objects** loads and previews the shared shell draft without requiring a display page selection, and verify with route-level editor coverage plus `pnpm --filter @solar-display/web test`.
- [ ] 1.2 [P] Implement **Model shell objects as header/footer scoped list items instead of page regions** so **Shared shell decoration authoring includes object list selection and ordering controls** exposes grouped object rows for `header` and `footer`, and verify with object-list-focused tests plus `pnpm --filter @solar-display/web test`.

## 2. Authoring controls

- [ ] 2.1 Implement **Keep object list as the primary selection surface for crowded shell decorations** so **Shared shell decoration authoring includes object list selection and ordering controls** supports select, delete, visibility, lock, and z-order actions with stable preview selection, and verify with interaction coverage plus `pnpm --filter @solar-display/web test`.
- [ ] 2.2 Implement **Draft and publish shared shell decorations independently from display pages** so **Shared shell decoration authoring publishes independently from display pages** saves and publishes shell config without mutating any display page draft, and verify with save or publish workflow tests plus `pnpm --filter @solar-display/web test`.

## 3. 驗證

- [ ] 3.1 Run `pnpm --filter @solar-display/web test` and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm the shared shell editor surface and authoring controls compile and pass their targeted coverage.
- [ ] 3.2 Run `spectra validate --strict --changes add-shared-shell-decoration-editor` to confirm the shared shell authoring artifacts remain internally consistent.
