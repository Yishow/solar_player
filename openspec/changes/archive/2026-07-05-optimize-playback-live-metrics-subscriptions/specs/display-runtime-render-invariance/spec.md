## MODIFIED Requirements

### Requirement: Render-output invariance under performance memoization

Performance optimizations applied to playback pages (Overview, Solar, FactoryCircuit) — including selector-scoped live metrics subscriptions, page-local static/live subtree boundaries, compatibility wrappers for full-snapshot consumers, and memoized shared display components — SHALL NOT change the render output. For an identical sequence of live-metrics socket snapshots, the post-optimization DOM structure, CSS class names, computed inline style values, text content, and card ordering SHALL be bit-equivalent to the pre-optimization output.

#### Scenario: Identical snapshot sequence produces identical render output

- **WHEN** a playback page receives the same ordered sequence of `liveMetrics:update` snapshots before and after the optimization
- **THEN** the rendered DOM structure, class names, inline style values, text content, and card order are identical between the two versions

#### Scenario: FHD witness shows no new visual difference

- **WHEN** an FHD witness capture (1920x1080) is taken for `/overview`, `/solar`, and `/factory-circuit` after the change
- **THEN** each capture compared against the corresponding reference in `docs/reference/FHD/` shows no new visual difference attributable to the selector-based optimization

### Requirement: Live data updates remain visible after memoization

Selector-based subscription isolation and memoization SHALL NOT cause stale rendering. When the underlying live-metrics data, weather data, story payload, or runtime config driving a visible playback subtree changes, the rendered output SHALL reflect the new data. Selector equality and memo boundaries SHALL include every runtime input needed to keep the selected subtree current.

#### Scenario: New snapshot value updates the displayed metric

- **WHEN** a `liveMetrics:update` snapshot delivers a changed value for a metric shown on a playback page
- **THEN** the corresponding card or value on the page updates to reflect the new value within the same render cycle as before the change

#### Scenario: Unrelated snapshot fields do not disturb unaffected output

- **WHEN** a `liveMetrics:update` snapshot changes only fields not read by a visible playback subtree
- **THEN** the unaffected subtree keeps the same rendered output
- **AND** no stale value appears in the subtree that does subscribe to changed runtime inputs

#### Scenario: Config change after hydration re-resolves the merged config

- **WHEN** the runtime resolved config for a playback page changes after initial hydration
- **THEN** the page recomputes the affected config-derived subtree and renders the updated config, even though per-second snapshot ticks alone do not trigger that recomputation

### Requirement: Existing visual-guardrail tests pass without modification

The change SHALL preserve existing visual-guardrail and runtime behavior coverage as the invariance gate. Existing output-level and behavior-level assertions SHALL pass without modification. An implementation-detail source assertion that directly encodes retired hook wiring SHALL be replaced only with an equal-or-stronger assertion of the new live-metrics subscription contract, and such a replacement SHALL NOT relax observable behavior coverage.

#### Scenario: Web test suite stays green with stable visual assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes
- **AND** no existing visual or observable-behavior assertion required weakening to accommodate the optimization

#### Scenario: Source-level contract assertion updates without relaxing behavior coverage

- **WHEN** an existing source-level assertion refers to retired `useLiveMetrics()` wiring details that no longer represent the optimized contract
- **THEN** the assertion is replaced with a new assertion of the selector-based subscription boundary or compatibility wrapper contract
- **AND** the replacement keeps the same or stronger verification of observable runtime behavior
