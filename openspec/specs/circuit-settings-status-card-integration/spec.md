# circuit-settings-status-card-integration Specification

## Purpose

TBD - created by archiving change 'integrate-circuit-status-into-card'. Update Purpose after archive.

## Requirements

### Requirement: Integrate status indicator into factory circuits card title

The system SHALL render the circuit settings status indicator (`mgmt-status cs-status`) inline within the factory circuits card title (`settings-card__title`) instead of absolute positioning at the top-right of the layout.

#### Scenario: Status indicator is shown in the card title

- **WHEN** the circuit settings page is loaded and status feedback is active
- **THEN** the status indicator SHALL be positioned inside the card title layout container
- **AND** the status indicator SHALL NOT float outside the card container

<!-- @trace
source: integrate-circuit-status-into-card
updated: 2026-07-08
code:
  - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/server/src/db/seed.ts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/hooks/displayTransition.ts
  - apps/server/src/db/migrations/004_playback.sql
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/CircuitSettings/circuitSettings.css
  - packages/shared/src/playback.ts
  - apps/server/src/db/migrations/001_init.sql
tests:
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - apps/web/src/hooks/displayTransition.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
-->