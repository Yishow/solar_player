## ADDED Requirements

### Requirement: Provide declarative story metric binding for Overview

The system SHALL let the `Overview` display page bind KPI cards and summary state declaratively instead of relying only on a fixed hardcoded metric order.

#### Scenario: Overview KPI binding changes

- **WHEN** the configured `Overview` story metric binding changes which metric drives a KPI card or summary state
- **THEN** the display route uses the updated binding
- **AND** fallback behavior remains defined when the bound metric is unavailable

### Requirement: Surface data freshness or alert state in Overview summary

The system SHALL let `Overview` show data freshness or alert state as part of its story summary.

#### Scenario: Overview data becomes stale

- **WHEN** the bound summary metrics are stale or disconnected
- **THEN** the `Overview` summary reflects that degraded state
- **AND** the page still renders a valid overview story
