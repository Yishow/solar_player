## MODIFIED Requirements

### Requirement: Maintain a first-class rotation plan for display pages

The system SHALL maintain a first-class rotation plan for display pages based on persisted page instances, not on a fixed built-in page list.

#### Scenario: Rotation plan includes operator-created page instances

- **WHEN** the registry contains additional active page instances derived from supported templates
- **THEN** the persisted rotation plan can include those instances with independent order, duration, and enabled state
- **AND** playback evaluates the resulting plan without assuming there are exactly five pages

##### Example: Rotation plan keeps two image-based pages

- **GIVEN** the registry contains two active page instances derived from the `images` template
- **WHEN** the operator assigns them different display orders and durations
- **THEN** the rotation plan persists both instances
- **AND** playback respects the configured sequence rather than collapsing them into one built-in page key
