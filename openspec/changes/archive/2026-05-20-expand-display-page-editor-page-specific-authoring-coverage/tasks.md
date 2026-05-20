## 1. Page-specific schema coverage

- [x] 1.1 Deliver `Provide page-specific authoring coverage for supported display pages` by extending `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx` and `apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts` with editable regions for pages that currently stop at preview-only coverage, and verify with `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`.
- [x] 1.2 Deliver `Replace coverage gaps with page-specific region schemas` by ensuring unsupported pages no longer rely on the generic fallback message once schema coverage is added, and verify through targeted editor rendering assertions.

## 2. Typed inspector integration

- [x] 2.1 Deliver `Keep page-specific authoring bound to the current draft session` by wiring new page-specific fields through `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx` and the existing draft session plumbing, and verify with `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` that edits stay bound to save/reset/preview flows.
- [x] 2.2 Deliver `Keep new page-specific controls inside the existing typed inspector contract` and `Describe region fields with a schema-aware inspector contract` with regression coverage, and verify using `pnpm --filter @solar-display/web test -- src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx src/pages/DisplayPagesEditor/inspectorFields.test.tsx`.
