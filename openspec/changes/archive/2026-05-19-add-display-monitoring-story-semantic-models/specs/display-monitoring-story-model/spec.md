## ADDED Requirements

### Requirement: Define a shared monitoring story model across Overview, Solar, and Factory Circuit

The system SHALL define a shared monitoring story model for `Overview`, `Solar`, and `Factory Circuit` that carries freshness, alert tone, fallback reason, and binding state.

#### Scenario: Shared story state is reused across pages

- **WHEN** one of the monitoring display pages receives runtime data and binding metadata
- **THEN** it can resolve freshness, alert tone, and fallback reason through the shared story model
- **AND** each page maps that model into its own presentation layout

##### Example: Overview and Solar both consume the same freshness state shape

- **GIVEN** `Overview` and `Solar` each receive metric bindings plus the same freshness metadata contract
- **WHEN** they build their page-local story outputs
- **THEN** both pages resolve freshness and alert tone from the shared story model
- **AND** each page renders that state in its own layout without redefining the underlying contract

### Requirement: Keep shared monitoring story model diagnosable

The system SHALL keep the shared monitoring story model diagnosable to management surfaces and tests.

#### Scenario: Story model exposes a fallback reason

- **WHEN** a story block is rendered using fallback data or missing binding information
- **THEN** the shared monitoring story model preserves the fallback reason
- **AND** tests or management surfaces can inspect that reason

##### Example: Factory Circuit row reports missing slot binding

- **GIVEN** a `Factory Circuit` load row has no explicit slot binding
- **WHEN** the page falls back to an unbound-row story state
- **THEN** the shared model includes a fallback reason such as `missing-slot-binding`
- **AND** tests can assert that reason directly
