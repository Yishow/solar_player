## 1. 管理 shell contract 收斂

- [x] 1.1 Implement **Adopt a single whole-page management canvas** so **Management routes share a single whole-page canvas shell** inside `ManagementShellFrame`/`ManagementShell`, and verify with `apps/web/src/components/shellFoundation.test.ts` coverage for `/brand` and `/settings/playback` plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 Implement **Reuse playback canvas layout math and explicit slot heights** so **Management shell uses playback-aligned canvas geometry and scaling** with a `1920x1080` canvas, `110/898/72` slots, and scale values above `1` on large viewports, and verify with scale/layout assertions in `apps/web/src/components/shellFoundation.test.ts` plus `pnpm --filter @solar-display/web test`.
- [x] 1.3 Implement **Preserve hideChrome inside the same canvas contract** so **Management shell preserves canvas behavior when chrome is hidden or content overflows** for `DisplayPagesEditor` edit mode, and verify with the hideChrome assertions in `apps/web/src/components/shellFoundation.test.ts` plus `pnpm --filter @solar-display/web test`.

## 2. Route metadata 與 helper 遷移

- [x] 2.1 Implement **Remove managementFrame route branching** so **Management routes share a single whole-page canvas shell** without `routeMeta.managementFrame` splits, and verify by updating `apps/web/src/app/routeMeta.ts`, removing split-model assertions from `apps/web/src/components/shellFoundation.test.ts`, and running `pnpm --filter @solar-display/web test`.
- [x] 2.2 [P] Reduce `apps/web/src/components/ManagementFixedLayoutFrame.tsx` to a content-only helper or remove it after **Adopt a single whole-page management canvas**, and verify by content review that `ManagementShell.tsx` is the only top-level scale owner plus `pnpm --filter @solar-display/web test`.

## 3. 回歸驗證

- [x] 3.1 [P] Add regression coverage so **Management shell preserves canvas behavior when chrome is hidden or content overflows** and the management header matches playback header scale at the same viewport, and verify with new web test cases plus a manual browser comparison of `/overview` and `/settings/playback` at one shared viewport.
- [x] 3.2 Run `spectra analyze unify-management-shell-canvas-scaling --json` and `spectra validate unify-management-shell-canvas-scaling` after implementation work is complete so the change remains analyzable and valid, and verify both commands exit successfully with no blocking findings.
