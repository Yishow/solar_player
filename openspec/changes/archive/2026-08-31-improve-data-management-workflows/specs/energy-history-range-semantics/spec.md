## ADDED Requirements

### Requirement: Energy History selects an explicit metric scope independently from time range

Energy History SHALL provide an explicit management metric-scope context for scoped datasets. Selecting CL, KN, or global SHALL determine which persisted history series/summaries are queried, while existing day/week/month/year/total range semantics continue to determine the time window or aggregation period. Scope and range MUST NOT be conflated.

#### Scenario: Operator views CL yearly history
- **WHEN** the operator selects scope CL and range `year`
- **THEN** the history query/summary uses CL-scoped records for the existing year range semantics
- **AND** KN/global records are not relabeled or merged into the CL series

#### Scenario: Operator switches from CL to KN without changing range
- **WHEN** the selected range remains `month` and the operator changes scope from CL to KN
- **THEN** the page reloads KN-scoped monthly history
- **AND** the month range boundaries/summary semantics remain the same

### Requirement: Global aggregate history is visibly global

When Energy History displays an explicit global aggregate series, the UI and returned management data SHALL identify that series as global/cross-site and MUST NOT label it as CL or KN.

#### Scenario: Operator views global total generation history
- **WHEN** a global CL+KN aggregate history series is selected
- **THEN** the scope label identifies global/cross-site data
- **AND** the series is read from global history records rather than by silently adding site histories in the browser unless that aggregation is the declared server contract

### Requirement: Empty scoped history does not fall back to another scope

If the selected scope has no records for the chosen range, Energy History SHALL show the existing empty/no-data state for that scope. It MUST NOT substitute another site's history or a global series to make the chart non-empty.

#### Scenario: KN has no records for selected week
- **WHEN** KN is selected and the requested week contains no KN history while CL has data
- **THEN** the KN view reports no data for the selected week
- **AND** CL values are not displayed as KN fallback
