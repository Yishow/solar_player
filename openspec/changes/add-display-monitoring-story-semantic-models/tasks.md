## 1. Shared monitoring story model

- [ ] 1.1 Deliver `Define a shared monitoring story model across Overview, Solar, and Factory Circuit` and reference `Define a shared monitoring story model across Overview, Solar, and Factory Circuit` by adding shared story-state fields for freshness, alert tone, fallback reason, and binding state, verified by shared model tests.
- [ ] 1.2 Deliver `Keep shared monitoring story model diagnosable` by preserving fallback and binding reasons in reusable story outputs, verified by targeted tests that inspect diagnostic fields.

## 2. Overview and Solar story semantics

- [ ] 2.1 Deliver `Provide declarative story metric binding for Overview` and `Surface data freshness or alert state in Overview summary` and reference `Keep Overview story metric binding declarative` by updating `Overview` story mapping to use configurable KPI bindings and summary states, verified by `pnpm --filter @solar-display/web test -- src/pages/Overview/viewModel.test.ts`.
- [ ] 2.2 Deliver `Provide flow state storytelling for Solar` and `Support comparison targets in Solar story blocks` by extending `Solar` story mapping with flow-state and comparison-target semantics, verified by `pnpm --filter @solar-display/web test -- src/pages/Solar/viewModel.test.ts`.

## 3. Factory Circuit slot binding and alerts

- [ ] 3.1 Deliver `Replace Factory Circuit load heuristics with explicit slot binding` and reference `Replace Factory Circuit heuristic mapping with explicit slot binding` by persisting and resolving explicit slot assignments for load rows, verified by targeted shared or server tests plus `src/pages/FactoryCircuit/viewModel.test.ts`.
- [ ] 3.2 Deliver `Provide alert reasons for Factory Circuit load rows` by adding deterministic alert reasons and missing-data states for bound rows, verified by `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/viewModel.test.ts` and targeted diagnostic assertions.
