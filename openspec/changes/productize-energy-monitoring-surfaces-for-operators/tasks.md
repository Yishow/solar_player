## 1. Freshness and source semantics

- [ ] 1.1 Deliver `Expose freshness and source state on energy monitoring surfaces` by extending `apps/web/src/pages/EnergyTrend/viewModel.ts` and `apps/web/src/pages/EnergyHistory/viewModel.ts` with explicit freshness, source-role, and degraded-state outputs, and verify with the corresponding view-model tests.
- [ ] 1.2 Deliver `Make freshness and source state explicit on monitoring surfaces` by updating `apps/web/src/pages/EnergyTrend/index.tsx` and `apps/web/src/pages/EnergyHistory/index.tsx` so the UI renders those operator-facing states consistently, and verify through targeted component or snapshot assertions.

## 2. Consistent empty and degraded workflows

- [ ] 2.1 Deliver `Keep empty and degraded monitoring states consistent across trend and history` by aligning empty/error/degraded state categories between the two pages, and verify with `apps/web/src/pages/EnergyTrend/viewModel.test.ts` and `apps/web/src/pages/EnergyHistory/viewModel.test.ts` cases for partial, stale, and missing data.
- [ ] 2.2 Deliver `Normalize empty and degraded monitoring states across trend and history` with regression coverage, and verify using `pnpm --filter @solar-display/web test -- src/pages/EnergyTrend/*.test.ts src/pages/EnergyHistory/*.test.ts`.
