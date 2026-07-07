# circuit-settings-visual-refinement Specification

## Purpose

TBD - created by archiving change 'integrate-circuit-status-into-card'. Update Purpose after archive.

## Requirements

### Requirement: Enhance input controls and table visuals on circuit settings page

The system SHALL visual-refine the inputs (`cs-input`), the delete buttons (`cs-delete`), and the status legend container (`cs-legend`) on the `/settings/circuits` page to have improved focus states, border radius, and premium shading.

#### Scenario: Input controls show high fidelity styling

- **WHEN** user hovers or focuses on a numeric or text input in the circuit table
- **THEN** the input SHALL transition smoothly with a soft shadow and use the primary green border accent on focus

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