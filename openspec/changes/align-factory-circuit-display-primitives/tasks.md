## 1. Factory KPI Alignment

- [ ] 1.1 Inventory current Factory KPI card DOM/CSS and map each header, icon, value, unit, and footer behavior to shared metric-card primitives.
- [ ] 1.2 Migrate Factory KPI cards to `DisplayCardFrame`, `DisplayCardHeader`, `DisplayCardValueRow`, and `DisplayCardFooter` or an equivalent wrapper without changing card geometry.
- [ ] 1.3 Add Factory-specific CSS variable overrides for compact routing/value variants instead of page-local absolute value positioning.

## 2. Circuit Node and Load Surface Vocabulary

- [ ] 2.1 Define a shared display node vocabulary for circuit/flow nodes, including surface, icon, zh/en label spacing, optional value, and status/accent treatment.
- [ ] 2.2 Migrate Factory circuit nodes to the shared node vocabulary while preserving existing node positions and topology.
- [ ] 2.3 Align Factory load rows with shared surface tokens and status/accent roles while keeping their compact row structure and alert semantics.

## 3. Routing Line Treatment

- [ ] 3.1 Tokenize Factory routing line colors for primary green, neutral, warning/accent, and endpoint treatment.
- [ ] 3.2 Refine routing SVG/connector visual treatment with soft display-wall polish while preserving topology and status mapping.
- [ ] 3.3 Confirm degraded, warning, danger, and neutral states remain distinguishable and accessible from display distance.

## 4. Validation

- [ ] 4.1 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [ ] 4.2 Run FactoryCircuit focused tests or add coverage for KPI primitive adoption and preserved slot/status semantics.
- [ ] 4.3 Manually review `/factory-circuit` against `/solar` and `/overview` for shared card/node family alignment without topology drift.
- [ ] 4.4 Run `spectra validate --strict --changes align-factory-circuit-display-primitives`.
