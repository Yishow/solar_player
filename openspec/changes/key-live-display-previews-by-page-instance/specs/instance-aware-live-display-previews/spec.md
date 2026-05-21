## ADDED Requirements

### Requirement: Resolve live display preview state by page instance

The system SHALL resolve live display preview state by page instance identity so duplicate instances of the same template can expose different live preview results.

#### Scenario: Duplicate template instances render different live previews

- **WHEN** two active display page instances share the same template but have different live configurations
- **THEN** the preview catalog SHALL keep separate live preview states for each instance
- **AND** each consumer SHALL read the state that matches the selected page instance

##### Example: Two overview instances show different live hero content

- **GIVEN** `overview` and `overview-2` are both active and published
- **AND** their live region payloads differ
- **WHEN** a management surface requests previews for both instances
- **THEN** the preview catalog returns one state for `overview` and another state for `overview-2`
- **AND** the two preview surfaces do not reuse the same resolved config object

### Requirement: Keep template renderers separate from instance state lookup

The system SHALL keep template renderer selection separate from preview state lookup so renderer reuse does not cause instance-level preview aliasing.

#### Scenario: Instance lookup fails without borrowing another instance preview

- **WHEN** a consumer has a template renderer but the requested page instance has no resolved preview state yet
- **THEN** the consumer SHALL render the instance-specific fallback state
- **AND** it SHALL NOT borrow the ready preview state of another instance that shares the same template
