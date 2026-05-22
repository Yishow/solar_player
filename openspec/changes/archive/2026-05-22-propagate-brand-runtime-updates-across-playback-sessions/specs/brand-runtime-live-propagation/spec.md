## ADDED Requirements

### Requirement: Propagate active brand updates to all connected playback sessions
The system SHALL propagate active brand updates to all connected playback sessions so header branding stays current without manual page reload.

#### Scenario: Active brand changes while playback is connected
- **GIVEN** one or more playback sessions are already connected
- **WHEN** the active brand profile, logo, or active-brand text is changed by a management operator
- **THEN** the runtime invalidation signal SHALL reach those sessions
- **AND** each session SHALL refresh its active brand view without a full-page reload

##### Example: Logo upload refreshes a remote playback header
- **GIVEN** a playback session is rendering the current active brand header
- **WHEN** an operator uploads a new logo for the active brand profile
- **THEN** the connected playback session refreshes the brand header data
- **AND** the header shows the new logo without resetting the current playback route

### Requirement: Keep playback runtime brand hydration scoped to the active brand payload
The system SHALL let playback runtime hydrate brand state from an active-brand-only payload instead of the full management profile list.

#### Scenario: Playback header bootstraps without management list data
- **WHEN** a playback route requests its initial brand state
- **THEN** the API SHALL return the active brand payload needed by the playback shell
- **AND** the runtime SHALL NOT require the full management profile list to render the header

##### Example: Playback header reads the active brand contract
- **GIVEN** the playback header needs logo, bilingual titles, and slogans
- **WHEN** the runtime bootstraps brand state
- **THEN** it receives the active brand payload only
- **AND** it can derive the rendered brand view from that payload safely
