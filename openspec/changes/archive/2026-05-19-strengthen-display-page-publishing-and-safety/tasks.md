## 1. Draft and live publishing model

- [x] 1.1 Deliver `Provide draft and live publishing channels for display page configuration` by extending the shared envelope and server persistence to store `draft` and `live` stages with version metadata, verified by `pnpm --filter @solar-display/server test` covering stage-specific reads and writes.
- [x] 1.2 Deliver `Support publish history and rollback for live display page configuration` and reference `Separate draft and live config channels` by adding publish and rollback APIs plus history reads, verified by targeted server route tests that publish a draft, read the new live version, and roll back successfully.

## 2. Validation and editor status workflow

- [x] 2.1 Deliver `Run layout safety guards before publish` and reference `Run layout safety guards before publish` by adding blocking server-side validation for geometry, required content, and invalid values, verified by targeted server tests that reject invalid publish payloads with structured findings.
- [x] 2.2 Deliver `Surface layout safety guards results in the editor workflow` by showing region-aware validation results and publish blocking state inside `apps/web/src/pages/DisplayPagesEditor/index.tsx`, verified by `pnpm --filter @solar-display/web test -- src/pages/DisplayPagesEditor/index.test.tsx`.

## 3. Runtime fallback policies

- [x] 3.1 Deliver `Keep fallback policy in shared display page configuration metadata` and reference `Keep fallback policy in shared config metadata` by defining shared fallback policy fields and reading them from live runtime pages, verified by `pnpm --filter @solar-display/web test -- src/hooks/useDisplayPageConfig.test.ts` and targeted runtime tests.
- [x] 3.2 Deliver `Expose fallback policy status to management surfaces` by returning effective fallback state from display page management APIs and showing it in publishing status UI, verified by manual inspection of `/display-pages/editor` plus targeted server response tests.
