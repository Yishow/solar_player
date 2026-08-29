## ADDED Requirements

### Requirement: Value-bearing display components expose authorable data bindings

For every supported value-bearing display component, the component editing model SHALL expose its stable item id and metric data binding through the shared Display Editor capability system. Data binding changes SHALL participate in the same draft, validation, publish, reset, and diff lifecycle as other page configuration changes.

#### Scenario: Operator changes a KPI metric binding
- **WHEN** an operator selects a supported KPI component in `/display-pages/editor`, changes its metric binding, and publishes the page
- **THEN** the published component renders from the new semantic metric binding
- **AND** the change is represented in page config rather than a page-local runtime hardcode

#### Scenario: Operator cancels an unpublished binding change
- **WHEN** an operator changes a data binding in draft state and resets/discards the draft before publish
- **THEN** the live page retains its previously published binding
- **AND** no runtime-only binding mutation remains active
