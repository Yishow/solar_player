## ADDED Requirements

### Requirement: Playback Settings keeps the editable form stable during tick and preview updates

The system SHALL keep the editable Playback Settings form and page rows stable while countdown, runtime progress, or preview rail data updates.

#### Scenario: Countdown update does not rebuild the editable form

- **WHEN** the countdown or runtime progress updates while the editable form is already visible
- **THEN** the page updates only the runtime subtree
- **AND** it keeps the editable form and page-row output equivalent to the pre-tick render

#### Scenario: Preview rail update does not rebuild the page-row editor

- **WHEN** preview rail state updates while the editable page rows are already visible
- **THEN** the page updates only the preview subtree
- **AND** it keeps the editable page-row editor equivalent to the pre-refresh render

### Requirement: Playback Settings preserves existing save and sync behavior while isolated lanes update

The system SHALL preserve save, reorder, and display-sync behavior while runtime and preview lanes are isolated from the editable form.

#### Scenario: Save or reorder completes without breaking isolated lanes

- **WHEN** the operator saves settings or reorders playback pages while countdown or preview updates are still occurring
- **THEN** the page completes the save or reorder flow with the existing success and error semantics
- **AND** it keeps the editable form and isolated runtime or preview lanes consistent after the update
