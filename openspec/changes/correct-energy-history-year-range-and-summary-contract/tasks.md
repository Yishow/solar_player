## 1. Year range query semantics

- [x] 1.1 Deliver `Treat year as a distinct Energy History range` by updating `apps/server/src/routes/metrics-history.ts` and related summary selection logic so `range=year` resolves to the current calendar year instead of aliasing `total`, and verify with server route tests that `year` and `total` return different period boundaries.
- [x] 1.2 Deliver `Treat year as a first-class range instead of aliasing total` by removing the front-end `year -> total` remap in `apps/web/src/pages/EnergyHistory/index.tsx`, and verify with `apps/web/src/pages/EnergyHistory/viewModel.test.ts` that the selected tab now drives annual semantics end to end.

## 2. Range-consistent summaries

- [x] 2.1 Deliver `Keep Energy History summaries consistent with the selected range` by aligning chart data, summary cards, and table rows to the same annual or cumulative period contract in `apps/web/src/pages/EnergyHistory/index.tsx` and `apps/web/src/pages/EnergyHistory/viewModel.ts`, and verify with `apps/web/src/pages/EnergyHistory/viewModel.test.ts` cases that `year` no longer reuses `total`-only values.
- [x] 2.2 Deliver `Align snapshot, summary, and counter labels to the same period contract` with regression coverage, and verify using `pnpm --filter @solar-display/server test -- src/routes/metrics-history*.ts` and `pnpm --filter @solar-display/web test -- src/pages/EnergyHistory/viewModel.test.ts`.
