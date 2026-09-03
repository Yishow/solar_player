## MODIFIED Requirements

### Requirement: Metric profile cards provide inline expandable usage and diagnostic inspection

The `Metrics` workspace SHALL present each semantic metric as a self-contained profile card containing current live value, freshness state, source provenance, and inline expandable sections for consumer page usage and data health diagnostics. The expanded content SHALL be derived from the current metric inventory, usage, and provenance responses for the card's `(metricScope, metricKey)` identity and SHALL NOT substitute hard-coded health or consumer claims. Operators SHALL be able to inspect which display pages reference the metric and review diagnostic health without navigating away to a separate full-page tab.

#### Scenario: Operator inspects metric usage and diagnostics inline
- **WHEN** an operator expands the usage and diagnostics section of a semantic metric card
- **THEN** the card displays the actual referencing playback pages and cards returned for that metric identity
- **AND** the card displays the actual freshness age and category, evaluation state, failure information when present, and diagnostic latency without leaving the Metrics view

#### Scenario: Metric detail data is loading, empty, or unavailable
- **WHEN** the usage or provenance request for an expanded metric is pending, returns no matching data, or fails
- **THEN** the card displays a distinct loading, empty, or error state for that result
- **AND** the card MUST NOT represent a failed or unavailable result as healthy

### Requirement: Managed Solar Adapters present a collapsible summary row

The `Sources` workspace SHALL present read-only managed Solar Collector adapters as a collapsible summary row by default. The collapsed DOM SHALL contain one summary row displaying health status, topic, and discovered zone count, while secondary metadata, discovered zone resources, and owned semantic metrics SHALL be rendered only in the expanded content. Operators SHALL be able to expand the row while keeping operator-managed generic MQTT mappings prominently visible.

#### Scenario: Operator views collapsed Sources workspace
- **WHEN** an operator opens the Sources workspace and a managed Solar adapter is collapsed
- **THEN** the adapter renders one compact summary row containing health, topic, and zone count
- **AND** secondary metadata, zone resources, and owned metrics are absent from the collapsed content

#### Scenario: Operator expands a Managed Solar adapter
- **WHEN** an operator activates the managed adapter summary control
- **THEN** the control exposes its expanded state
- **AND** the adapter renders its secondary metadata, full zone details, and owned metrics
