## 1. Migration and profile seam

- [ ] 1.1 Add the formal Default Playback Profile schema and idempotent legacy-data migration; verify with the migration contract test.
- [ ] 1.2 Add a single Profile service seam that owns Default Profile settings and page state; verify through focused service/API tests.

## 2. Compatibility façade

- [ ] 2.1 Route existing playback settings, pages, rotation plan and preview through the Default Profile service without changing API contracts.
- [ ] 2.2 Move display page registry create/update/archive and readiness scope to Profile Page state so production has no playback dual-write.

## 3. Seed, regression and documentation

- [ ] 3.1 Attach seeded registry pages to the Default Profile without overwriting operator-saved state; update persistence tests.
- [ ] 3.2 Update affected fixtures and run focused tests, full server/web suites, build and `pnpm verify`.
- [ ] 3.3 Document the Default Profile, compatibility façade, legacy remnants and removal conditions.
- [ ] 3.4 Review the completed diff against repository standards and Issue #5 before finalizing the PR.
