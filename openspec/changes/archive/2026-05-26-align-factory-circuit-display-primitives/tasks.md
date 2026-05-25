## 1. Factory KPI Alignment

- [x] 1.1 Inventory current Factory KPI card DOM/CSS and map each header, icon, value, unit, and footer behavior to shared metric-card primitives.
- [x] 1.2 Align Factory KPI cards with the shared metric-card family by migrating them to `DisplayCardFrame`, `DisplayCardHeader`, `DisplayCardValueRow`, and `DisplayCardFooter` or an equivalent wrapper without changing card geometry.
- [x] 1.3 Add Factory-specific CSS variable overrides for compact routing/value variants instead of page-local absolute value positioning.

## 2. Circuit Node and Load Surface Vocabulary

- [x] 2.1 Share a display node vocabulary for circuit nodes, including surface, icon, zh/en label spacing, optional value, and status/accent treatment.
- [x] 2.2 Migrate Factory circuit nodes to the shared node vocabulary while preserving existing node positions and topology.
- [x] 2.3 Align load rows through surface tokens without turning them into KPI cards, while keeping their compact row structure and alert semantics.

## 3. Routing Line Treatment

- [x] 3.1 Tokenize Factory routing line colors for primary green, neutral, warning/accent, and endpoint treatment.
- [x] 3.2 Refine Factory routing treatment without changing status semantics by polishing SVG/connector strokes while preserving topology and status mapping.
- [x] 3.3 Confirm degraded, warning, danger, and neutral states remain distinguishable and accessible from display distance.

## 4. Validation

- [x] 4.1 Run `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`.
- [x] 4.2 Run FactoryCircuit focused tests or add coverage for KPI primitive adoption and preserved slot/status semantics.
- [x] 4.3 Manually review `/factory-circuit` against `/solar` and `/overview` for shared card/node family alignment without topology drift.
- [x] 4.4 Run `spectra validate --strict --changes align-factory-circuit-display-primitives`.
