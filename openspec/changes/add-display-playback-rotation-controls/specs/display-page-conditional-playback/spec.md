## ADDED Requirements

### Requirement: Evaluate conditional playback for display pages at runtime

The system SHALL evaluate conditional playback rules for display pages using schedule, page readiness, and health state before selecting the next page to play.

#### Scenario: A page is skipped because conditions are not met

- **GIVEN** a display page is enabled in the rotation plan
- **WHEN** its runtime conditions are not satisfied
- **THEN** the page is excluded from the effective playback sequence for that evaluation cycle
- **AND** the runtime continues evaluating the remaining pages

### Requirement: Reuse conditional playback result in management preview

The system SHALL make the same conditional playback result available to management surfaces that preview the effective rotation.

#### Scenario: Preview matches runtime condition evaluation

- **WHEN** the management surface asks for an effective rotation preview under the current conditions
- **THEN** it receives the same playable and skipped pages the runtime would use
- **AND** it can distinguish skipped pages from disabled pages

##### Example: Preview and runtime both skip Sustainability for the same reason

- **GIVEN** `sustainability` is enabled in the rotation plan but currently fails readiness checks
- **WHEN** the management preview requests the effective rotation
- **THEN** the preview excludes `sustainability` just like the runtime would
- **AND** both outputs identify it as skipped rather than disabled
