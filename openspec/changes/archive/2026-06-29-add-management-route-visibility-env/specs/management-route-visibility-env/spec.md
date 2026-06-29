## ADDED Requirements

### Requirement: Hide configured management routes from navigation

The system SHALL read `VITE_HIDDEN_MANAGEMENT_ROUTES` as a comma-separated list of management route paths and SHALL omit matching management routes from operator navigation.

#### Scenario: Trends and History are hidden by default

- **WHEN** the web bundle is built with `VITE_HIDDEN_MANAGEMENT_ROUTES=/trends,/history`
- **THEN** management navigation SHALL NOT include `趨勢`
- **AND** management navigation SHALL NOT include `歷史`
- **AND** other visible management routes SHALL remain available

#### Scenario: Hidden route input includes spaces and repeated commas

- **WHEN** `VITE_HIDDEN_MANAGEMENT_ROUTES` contains spaces, empty segments, or repeated commas
- **THEN** the route visibility resolver SHALL ignore empty segments
- **AND** it SHALL match trimmed absolute paths exactly

### Requirement: Redirect direct access to hidden management routes

The system SHALL redirect direct access to hidden management routes before mounting the hidden page component or loading its page-specific runtime data.

#### Scenario: Operator opens a hidden monitoring route directly

- **WHEN** `/trends` is hidden and the operator navigates directly to `/trends`
- **THEN** the router SHALL redirect to a visible safe route
- **AND** the Energy Trend page SHALL NOT mount for that navigation

#### Scenario: All configured hidden routes are management routes

- **WHEN** a configured hidden route does not match a known management route
- **THEN** the resolver SHALL ignore that entry
- **AND** playback routes SHALL NOT be hidden through this management-only setting

### Requirement: Keep playback page enablement independent

The system SHALL keep `VITE_HIDDEN_MANAGEMENT_ROUTES` independent from playback page enablement and display page rotation settings.

#### Scenario: Playback pages remain visible while monitoring routes are hidden

- **WHEN** `/trends` and `/history` are hidden through the environment setting
- **THEN** `/overview`, `/solar`, `/factory-circuit`, `/images`, and `/sustainability` SHALL remain governed by the existing playback registry and playback settings
- **AND** the management route visibility setting SHALL NOT mutate `playback_pages.enabled`
