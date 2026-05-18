## ADDED Requirements

### Requirement: Evaluate display readiness checks from MQTT and circuit configuration

The system SHALL evaluate display readiness checks from MQTT mappings and circuit configuration so management surfaces can tell whether a display story is ready for production playback.

#### Scenario: Readiness check finds blocking gap

- **WHEN** a required topic mapping or slot binding is missing for a display story
- **THEN** the readiness check reports a blocking finding
- **AND** the finding identifies the affected page or story requirement

##### Example: Factory Circuit readiness fails without a production slot binding

- **GIVEN** the `Factory Circuit` story requires a bound `production` slot
- **WHEN** no circuit is assigned to that slot
- **THEN** the readiness check reports a blocking finding
- **AND** it identifies the affected page and the missing slot requirement

### Requirement: Reuse display readiness checks across management surfaces

The system SHALL reuse display readiness checks across settings, editor, playback, or diagnostics surfaces.

#### Scenario: Another management surface requests readiness

- **WHEN** a management surface other than the settings pages requests display readiness
- **THEN** it receives the same readiness findings produced from current MQTT and circuit configuration

##### Example: Editor reads the same blocking findings as MQTT settings

- **GIVEN** `MQTT Settings` already reports a missing mapping for an `Overview` metric
- **WHEN** `Display Pages Editor` requests display readiness
- **THEN** it receives the same blocking finding derived from the current configuration
