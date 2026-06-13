## ADDED Requirements

### Requirement: Preview consumers load the requested visible window first

The system SHALL let preview consumers request a visible window of page keys so those keys resolve before deferred preview keys.

#### Scenario: Visible preview cards load before deferred cards

- **WHEN** a preview consumer requests a visible subset of page keys
- **THEN** the shared preview loader resolves loading or warm states for that subset first
- **AND** it continues loading deferred keys in the background without blocking the visible cards

### Requirement: Deferred preview failures stay isolated

The system SHALL keep deferred or failed preview keys isolated from unrelated visible keys.

#### Scenario: One preview key fails while the visible window stays usable

- **WHEN** one requested or deferred preview key fails after other visible keys already have usable state
- **THEN** the failed key exposes its own degraded or error state
- **AND** the other visible keys keep their existing loading, warm, or resolved output

### Requirement: Visible preview loading preserves page-instance identity

The system SHALL preserve page-instance identity while loading only the requested visible preview window.

#### Scenario: Duplicate template instances stay distinct in the visible window

- **WHEN** the requested visible window contains two page instances that share a template but use different page keys
- **THEN** the preview loader keeps separate preview state for each page instance
- **AND** loading the visible window does not collapse the two instances into one shared preview result
