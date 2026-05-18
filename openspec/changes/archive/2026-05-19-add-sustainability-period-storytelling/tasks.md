## 1. Period comparison model

- [x] 1.1 Deliver `Model Sustainability metrics by period key` and reference `Model Sustainability metrics by period key` by introducing periodized Sustainability summary data with consistent period selection, verified by shared model tests and `pnpm --filter @solar-display/web test -- src/pages/Sustainability/viewModel.test.ts`.
- [x] 1.2 Deliver `Preserve period selection consistency across Sustainability story blocks` by wiring the chosen period into highlight, big number, and dependent story blocks, verified by targeted view model tests.

## 2. Provenance and sync state

- [x] 2.1 Deliver `Keep data provenance as first-class presentation data in Sustainability` and reference `Keep data provenance as first-class presentation data` by adding provenance and sync-state fields to Sustainability story outputs, verified by targeted view model or shared model tests.
- [x] 2.2 Deliver `Expose Sustainability provenance to management or diagnostics surfaces` by returning provenance metadata from relevant APIs or diagnostics reads, verified by targeted server tests.

## 3. Story modules

- [x] 3.1 Deliver `Compose Sustainability story modules from configurable content blocks` and reference `Compose story modules instead of hardcoding one fixed bottom layout` by defining configurable module payloads for milestones or ESG summaries, verified by content model tests and page rendering checks.
- [x] 3.2 Deliver `Keep Sustainability story modules compatible with fallback content` by preserving readable module fallback when configured content is incomplete, verified by `pnpm --filter @solar-display/web test -- src/pages/Sustainability/viewModel.test.ts`.
