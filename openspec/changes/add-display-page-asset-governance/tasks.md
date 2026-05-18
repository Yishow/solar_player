## 1. Managed asset references

- [x] 1.1 Deliver `Bind display page media fields to managed asset library references` and reference `Use managed asset references instead of raw src strings` by extending shared config and server resolution to save managed asset identifiers for display-page media, verified by `pnpm --filter @solar-display/server test` coverage for reference resolution.
- [x] 1.2 Deliver `Protect managed asset references from silent breakage` by surfacing missing or unresolved asset findings from management APIs, verified by targeted server tests that remove or invalidate a referenced asset and inspect the response.

## 2. Media placement controls

- [x] 2.1 Deliver `Provide per-binding media placement controls for display pages` and reference `Store media placement controls beside each media binding` by adding editor fields and runtime support for focal point, fit behavior, and alignment, verified by `pnpm --filter @solar-display/web test` or manual preview checks on at least one hero and one stage image.
- [x] 2.2 Deliver `Keep media placement controls within safe bounds` by validating placement values on save or publish, verified by targeted API tests that submit invalid placement control payloads.

## 3. Asset health reporting

- [ ] 3.1 Deliver `Report asset health for display page references` and reference `Compute asset health reporting from references and repository state` by adding server-side health computation that returns affected pages and reasons, verified by targeted server tests.
- [ ] 3.2 Deliver `Show asset health reporting where operators edit or manage media` by exposing those findings in `apps/web/src/pages/DisplayPagesEditor` and `apps/web/src/pages/ImageManagement`, verified by manual inspection plus targeted web tests for rendered status states.
