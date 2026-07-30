## ADDED Requirements

### Requirement: Persist the Device Cookie in a dedicated Firefox Profile

The thin-kiosk installer SHALL create a dedicated Firefox Profile owned by the kiosk user with mode 0700 and SHALL launch the remote Solar Player HTTPS URL with that Profile without private-window mode. The Profile SHALL NOT be shared with general browsing. Because the Profile is persistent runtime state, install SHALL reject an active overlayroot before migration mutations and SHALL remove stale co-located readonly launchers previously created by the thin-kiosk installer.

#### Scenario: Pair a newly installed thin kiosk

- **WHEN** an operator opens the one-time fragment pairing path with the dedicated Firefox Profile
- **THEN** the Browser exchanges the Pairing Token and stores the Device Credential only as an HttpOnly Cookie in that Profile
- **AND** subsequent kiosk launches use the configured playback URL without retaining the Pairing Token

#### Scenario: Restart a paired thin kiosk

- **WHEN** a paired thin kiosk restarts Firefox or reboots the Pi
- **THEN** the solar_device_credential cookie remains available to Server requests
- **AND** the Client does not require re-pairing

#### Scenario: Verify the installed launcher

- **WHEN** the thin-kiosk verifier inspects the installed browser command and Profile
- **THEN** it confirms the dedicated Profile is selected
- **AND** it confirms the Profile owner is the kiosk user and mode is 0700
- **AND** it fails if private-window mode is present
- **AND** it fails if stale readonly launchers remain
