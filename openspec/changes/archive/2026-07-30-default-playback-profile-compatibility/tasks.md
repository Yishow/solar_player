## 1. Migration and profile seam

- [x] 1.1 Add the formal Default Playback Profile plus global Runtime Policy schema and idempotent legacy-data migration; verify with the migration contract test.
- [x] 1.2 Add a Profile service seam for Profile-owned settings/page state and a global Runtime Policy seam; verify through focused service/API tests.

## 2. Compatibility façade

- [x] 2.1 Route existing playback settings, pages, rotation plan and preview through the composed Default Profile and global Runtime Policy seams without changing API contracts.
- [x] 2.2 Move display page registry create/update/archive and readiness scope to Profile Page state so production has no playback dual-write.

## 3. Seed, regression and documentation

- [x] 3.1 Attach seeded registry pages to the Default Profile without overwriting operator-saved state; update persistence tests.
- [x] 3.2 Update affected fixtures and run focused tests, full server/web suites, build and `pnpm verify`.
- [x] 3.3 Document the Default Profile, global Runtime Policy, compatibility façade, legacy remnants and removal conditions.
- [x] 3.4 Review the completed diff against repository standards and Issue #5 before finalizing the PR.
