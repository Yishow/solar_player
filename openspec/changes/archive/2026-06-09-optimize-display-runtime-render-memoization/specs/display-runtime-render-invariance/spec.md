## ADDED Requirements

### Requirement: Render-output invariance under performance memoization

Performance optimizations applied to playback pages (Overview, Solar, FactoryCircuit) — including `useMemo` wrapping of viewModel construction and config merge, prop-reference stabilization, and `React.memo` on shared display components — SHALL NOT change the render output. For an identical sequence of live-metrics socket snapshots, the post-optimization DOM structure, CSS class names, computed inline style values, text content, and card ordering SHALL be bit-equivalent to the pre-optimization output.

#### Scenario: Identical snapshot sequence produces identical render output

- **WHEN** a playback page receives the same ordered sequence of `liveMetrics:update` snapshots before and after the memoization change
- **THEN** the rendered DOM structure, class names, inline style values, text content, and card order are identical between the two versions

#### Scenario: FHD witness shows no new visual difference

- **WHEN** an FHD witness capture (1920x1080) is taken for `/overview`, `/solar`, and `/factory-circuit` after the change
- **THEN** each capture compared against the corresponding reference in `docs/reference/FHD/` shows no new visual difference attributable to the memoization change

### Requirement: Live data updates remain visible after memoization

Memoization SHALL NOT cause stale rendering. When the underlying live-metrics data driving a memoized viewModel or display component changes, the rendered output SHALL reflect the new data. Memo dependency lists SHALL include every input the memoized computation reads.

#### Scenario: New snapshot value updates the displayed metric

- **WHEN** a `liveMetrics:update` snapshot delivers a changed value for a metric shown on a playback page
- **THEN** the corresponding card or value on the page updates to reflect the new value within the same render cycle as before the change

#### Scenario: Config change after hydration re-resolves the merged config

- **WHEN** the runtime resolved config for a playback page changes after initial hydration
- **THEN** the memoized merged config recomputes and the page renders the updated config, even though per-second snapshot ticks alone do not trigger that recomputation

##### Example: snapshot ticks do not recompute config, config change does

| Event                                  | Config useMemo recomputes? | Rendered config |
| -------------------------------------- | -------------------------- | --------------- |
| Initial hydration sets resolved config | yes (first compute)        | config v1       |
| `liveMetrics:update` snapshot tick     | no                         | config v1       |
| Runtime resolved config changes to v2  | yes                        | config v2       |

### Requirement: Existing visual-guardrail tests pass without modification

The change SHALL preserve existing web test coverage as the invariance gate. Existing playback-page and visual-guardrail tests SHALL pass without modification. A required modification to an existing visual or behavioral assertion SHALL be treated as a signal of an unintended render change and SHALL halt the change for review.

#### Scenario: Web test suite stays green without editing assertions

- **WHEN** `pnpm --filter @solar-display/web test` runs after the change
- **THEN** the suite passes and no existing visual or behavioral assertion required editing to make it pass
