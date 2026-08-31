## MODIFIED Requirements

### Requirement: Data Hub separates connection, source, metric, usage, diagnostics, and external-data concerns

The management application SHALL provide a streamlined `Data Hub` workspace with primary navigable areas for `Connections`, `Sources`, `Metrics` (which consolidates semantic metrics, usage tracking, and diagnostics), and `External Data`. The workspace SHALL preserve backward-compatible redirects for legacy `/settings/data-hub/usage` and `/settings/data-hub/diagnostics` sub-paths to the consolidated `Metrics` workspace while preserving scope and metric filters.

#### Scenario: Operator opens Data Hub
- **WHEN** an authorized operator opens Data Hub
- **THEN** the workspace exposes the consolidated primary areas with clear labels
- **AND** broker configuration appears under Connections and MQTT source management rather than wrapping Weather/External Data

#### Scenario: Operator opens legacy usage or diagnostics path
- **WHEN** an operator navigates to `/settings/data-hub/usage` or `/settings/data-hub/diagnostics`
- **THEN** the application redirects to `/settings/data-hub/metrics` while preserving the requested scope or metric key in query parameters

## ADDED Requirements

### Requirement: Metric profile cards provide inline expandable usage and diagnostic inspection

The `Metrics` workspace SHALL present each semantic metric as a self-contained profile card containing current live value, freshness state, source provenance, and inline expandable sections for consumer page usage and data health diagnostics. Operators SHALL be able to inspect which display pages reference the metric and review diagnostic health without navigating away to a separate full-page tab.

#### Scenario: Operator inspects metric usage and diagnostics inline
- **WHEN** an operator views a semantic metric card and toggles the usage and diagnostics section
- **THEN** the card expands inline to display the list of referencing playback pages and cards
- **AND** the card displays live freshness details, contract verification state, and diagnostic latency without leaving the Metrics view

### Requirement: Managed Solar Adapters present a collapsible summary row

The `Sources` workspace SHALL present read-only managed Solar Collector adapters as a collapsible summary row by default, displaying health status, topic, and discovered zone counts in a compact bar. Operators SHALL be able to expand the row to view detailed discovered zone resources and owned semantic metrics while keeping operator-managed generic MQTT mappings prominently visible.

#### Scenario: Operator views Sources workspace
- **WHEN** an operator opens the Sources workspace
- **THEN** managed Solar adapters render as a compact, single-row summary
- **AND** the operator can click to expand full zone details and owned metrics on demand
