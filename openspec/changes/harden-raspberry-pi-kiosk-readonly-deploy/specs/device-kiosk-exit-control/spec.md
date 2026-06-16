## ADDED Requirements

### Requirement: Install a concrete desktop re-entry target for kiosk exit guidance

The system SHALL back kiosk exit re-entry guidance with an installed desktop launcher named `Solar Display Kiosk` for the kiosk user.

#### Scenario: Kiosk exit guidance has an installed desktop target

- **WHEN** the kiosk installer completes for user `kz`
- **THEN** the user's desktop SHALL contain a `Solar Display Kiosk` launcher
- **AND** the launcher SHALL invoke the fixed kiosk start helper
- **AND** the Device Status kiosk exit guidance SHALL name the same launcher

#### Scenario: Re-entry target is missing during verification

- **WHEN** the kiosk verification command runs and the desktop launcher is missing
- **THEN** verification SHALL fail
- **AND** it SHALL report that Device Status re-entry guidance is not backed by an installed desktop launcher
