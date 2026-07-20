## ADDED Requirements

### Requirement: Align only the remaining partial reference pages in this change

The implementation SHALL align only `/factory-circuit`, `/sustainability`, and `/offline` in this change, and SHALL NOT reopen already-close playback routes, settings-management routes, shared shell foundation, or backend contracts.

#### Scenario: The remaining reference batch starts

- **WHEN** this change is applied
- **THEN** only the three remaining partial routes are in scope
- **AND** previously migrated close pages remain outside the implementation batch

##### Example: scope stays on the last three pages

- **GIVEN** `/overview`, `/solar`, `/images`, `/trends`, `/history`, `/slideshow-preview`, and `/device-status` are already marked `close`
- **WHEN** this change is executed
- **THEN** it does not rework those routes
- **AND** it focuses on `/factory-circuit`, `/sustainability`, and `/offline`

### Requirement: Migrate Factory Circuit and Sustainability onto the shared playback reference body model

`/factory-circuit` and `/sustainability` SHALL render their main page bodies through page-local layout constants, route-local CSS, and reference-style absolute composition rather than a dashboard title block or generic grid body.

#### Scenario: Factory Circuit is rendered after migration

- **WHEN** `/factory-circuit` renders
- **THEN** the route shows a reference-like title group, flow diagram, load panel, and KPI band
- **AND** it no longer depends on `PageScaffold` title block as the main page composition

##### Example: Factory Circuit keeps fallback data while changing the body model

- **GIVEN** circuits data is empty or the circuits API fails
- **WHEN** `/factory-circuit` renders its migrated body
- **THEN** the diagram, load rows, and KPI band still render with fallback structure
- **AND** the page exposes the empty-state messaging instead of collapsing the layout

#### Scenario: Sustainability is rendered after migration

- **WHEN** `/sustainability` renders
- **THEN** the route shows a reference-like storytelling title group, hero media, compact KPI row, stat cards, and highlight row
- **AND** it no longer depends on `PageScaffold` title block as the main page composition

##### Example: Sustainability keeps readable fallback content

- **GIVEN** summary data is missing or an asset source is unavailable
- **WHEN** `/sustainability` renders its migrated body
- **THEN** it still displays readable KPI and stat placeholders with the existing storytelling copy
- **AND** the page does not render broken assets as its primary content

### Requirement: Preserve Offline reconnect and retry behavior while aligning the error surface

`/offline` SHALL align to the reference-style centered error panel and media background while preserving the existing reconnect countdown, manual retry, return-to routing, and automatic navigation back to the original route when MQTT becomes connected.

#### Scenario: Offline screen is shown while disconnected

- **WHEN** the app navigates to `/offline` while MQTT is disconnected
- **THEN** the route shows a reference-like error panel with reconnect timing, reason details, and recovery guidance
- **AND** the retry countdown and manual retry action remain operational

##### Example: automatic return is preserved

- **GIVEN** `/offline` was opened with `returnTo=/factory-circuit`
- **WHEN** MQTT status becomes connected again
- **THEN** the route navigates back to `/factory-circuit`
- **AND** the offline body alignment does not interfere with that return behavior
