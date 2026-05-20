## MODIFIED Requirements

### Requirement: Record skip reason reporting for skipped display pages

The system SHALL report page skip reasons from the same effective eligibility decision used by rotation and offline/fault routing.

#### Scenario: Operator reviews why a page was skipped

- **WHEN** an operator inspects effective rotation or display operations summary
- **THEN** the reported skip reason matches the reason that actually removed the page from playback
- **AND** it identifies the dominant blocking or degraded dependency

##### Example: Effective rotation and diagnostics agree on readiness failure

- **GIVEN** `sustainability` is configured in the stored rotation plan
- **WHEN** its required upstream aggregate is unavailable and policy disallows degraded playback
- **THEN** effective rotation reports a sustainability skip reason tied to that missing dependency
- **AND** the diagnostics surface reports the same dominant skip reason
