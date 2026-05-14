## ADDED Requirements

### Requirement: Render application routes inside a fixed FHD canvas host

The web application SHALL host route content inside a shared 1920x1080 internal design canvas with viewport scaling, and SHALL NOT treat the shell as only a centered max-width container with a scrollable content stack.

#### Scenario: The browser viewport is not 1920x1080

- **WHEN** the application renders on a viewport that is smaller or larger than 1920x1080
- **THEN** the shared shell preserves a 1920x1080 internal layout coordinate system
- **AND** the viewport fit is achieved through scaling the canvas host rather than recomputing page layout as a generic responsive dashboard

##### Example: scaled kiosk shell host

- **GIVEN** the browser viewport is 1366x768
- **WHEN** the root shell renders
- **THEN** the header, content canvas, and footer keep the same relative geometry as the 1920x1080 design surface
- **AND** the route body does not become a vertically scrollable card stack just because the viewport is smaller

### Requirement: Separate playback shell structure from management-page scaffold structure

Playback routes SHALL be able to render through a playback-specific shell primitive or title-group contract, while management routes SHALL remain free to use the existing scaffold family without forcing playback pages through the same title-description layout.

#### Scenario: A playback route renders through the shared shell

- **WHEN** a playback witness route renders
- **THEN** it is not required to use the management-style `PageScaffold` title, subtitle, description, and page-number block as its primary page-body structure
- **AND** the shell still provides shared header, footer, and page numbering chrome

##### Example: playback shell split is observable

- **GIVEN** `/overview` is used as the playback witness route
- **WHEN** the route renders after this change
- **THEN** the page body can consume playback-specific shell structure instead of the generic management title block
- **AND** `/settings/playback` can continue using the scaffold family without inheriting a playback-only title group

### Requirement: Limit this change to shell host repair and witness verification

This change SHALL be limited to shared shell host repair, playback-versus-management shell boundary repair, and witness-route verification, and SHALL NOT claim full page-body reference alignment for the 14 runtime routes.

#### Scenario: Witness validation is completed

- **WHEN** the change is reviewed
- **THEN** at least one playback route and one management route demonstrate the repaired shell host and shell split behavior
- **AND** the review does not require the same change to finish page-specific absolute-position compositions, page-level asset binding, or route-specific reference parity

##### Example: narrow witness scope

- **GIVEN** `/overview` is the playback witness route and `/settings/playback` is the management witness route
- **WHEN** the shared shell repair is implemented
- **THEN** those routes are sufficient to verify shared shell host behavior and shell boundary separation
- **AND** `/solar`, `/factory-circuit`, `/images`, and the remaining routes SHALL be allowed to remain page-body `partial` until later changes
