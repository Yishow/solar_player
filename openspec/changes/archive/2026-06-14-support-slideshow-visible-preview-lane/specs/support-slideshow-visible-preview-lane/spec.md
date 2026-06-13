## ADDED Requirements

### Requirement: Slideshow Preview loads visible cards before deferred preview cards

The system SHALL let Slideshow Preview load preview state for the visible card window before deferred cards.

#### Scenario: Visible cards stay usable while deferred cards continue loading

- **WHEN** Slideshow Preview enters with more queued cards than the visible card window
- **THEN** the page resolves loading, warm, or visible preview state for the visible cards first
- **AND** deferred cards continue loading without blocking the visible queue window

##### Example: six-card queue with five-card visible window

- **GIVEN** Slideshow Preview has six enabled cards and the visible window contains five cards
- **WHEN** the preview catalog is requested
- **THEN** only the five visible page keys are requested for the first preview lane
- **AND** playback summary and queue controls render before the sixth card preview resolves

### Requirement: Slideshow Preview keeps controls and queue behavior stable during deferred preview loading

The system SHALL keep playback summary, current-page status, and manual navigation usable while deferred preview cards continue loading or fail.

#### Scenario: Deferred preview failure does not disable queue controls

- **WHEN** one deferred preview card fails after the visible queue is already usable
- **THEN** the page keeps manual next, manual previous, summary, and current-page status usable
- **AND** it surfaces degraded state only for the failed card

##### Example: one failed card beside a ready card

- **GIVEN** one visible card has ready preview content and another card reports config-unavailable
- **WHEN** Slideshow Preview renders the queue
- **THEN** the ready card remains visible with its resolved preview content
- **AND** only the failed card renders the live preview fallback state
