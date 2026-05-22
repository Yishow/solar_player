## MODIFIED Requirements

### Requirement: Replace Factory Circuit load heuristics with explicit slot binding

The system SHALL let `Factory Circuit` bind load rows to explicit display slots instead of inferring them only from circuit icon or name, and SHALL re-resolve the fallback circuit rows from the latest circuits snapshot whenever the runtime fallback source receives a relevant sync invalidation.

#### Scenario: Circuit is assigned to a display slot

- **WHEN** a circuit is bound to a named `Factory Circuit` display slot
- **THEN** the corresponding load row uses that circuit's runtime values
- **AND** unbound slots remain distinguishable from populated ones

#### Scenario: Fallback rows refresh after relevant sync invalidation

- **GIVEN** the `Factory Circuit` page is currently filling missing story slots from circuits fallback data
- **WHEN** a `display:sync` event with scope `circuits` or `display-pages` arrives
- **THEN** the page reloads the circuits fallback source before the next settled render
- **AND** the fallback rows reflect the latest slot binding and enablement without requiring a full page reload

##### Example: Updated slot assignment replaces stale fallback rows

- **GIVEN** the last settled fallback rows showed circuit `A` in slot `hvac`
- **AND** the latest circuits source now binds circuit `B` to slot `hvac`
- **WHEN** the runtime handles `display:sync(scope=circuits)`
- **THEN** the next settled `hvac` row shows circuit `B` instead of circuit `A`

#### Scenario: Refresh failure preserves the last settled fallback rows

- **GIVEN** the `Factory Circuit` page already rendered fallback rows from a prior successful circuits load
- **WHEN** a later sync-triggered circuits refresh fails
- **THEN** the page keeps the last settled fallback rows visible
- **AND** the runtime surfaces the refresh failure through its existing fallback or error state instead of blanking the layout
