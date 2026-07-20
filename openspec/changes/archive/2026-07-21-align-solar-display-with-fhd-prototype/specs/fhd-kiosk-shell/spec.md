## ADDED Requirements

### Requirement: Provide a shared FHD kiosk shell before route-specific migration

The web application SHALL define and review a shared FHD kiosk shell before any route-specific visual migration is marked complete.

#### Scenario: Shell foundation is implemented first

- **GIVEN** the implementation has not yet migrated any route-specific page body
- **WHEN** the team starts the prototype alignment rollout
- **THEN** it first updates the shared shell contract for header, footer, page number, content canvas, and route container
- **AND** no page migration SHALL be marked complete until it renders inside that reviewed shell

##### Example:

- **GIVEN** `/overview` is the first route to receive a prototype-aligned page body
- **WHEN** the migration begins
- **THEN** `LayoutShell`, `AppHeader`, `AppFooterNav`, `PageScaffold`, and `PageContainer` are updated before the `/overview` body is accepted as final
- **AND** `/overview` is not allowed to keep its own duplicated shell markup

### Requirement: Expose reusable shell primitives and density variants

The application SHALL provide reusable shell primitives and density variants so playback, settings, and device-detail pages can compose prototype-aligned sections without per-page shell duplication.

#### Scenario: A page needs prototype-aligned shell elements

- **WHEN** a page needs a title block, status pill, action cluster, media slot, section wrapper, or page-density rule already represented in the prototype
- **THEN** the page composes a shared primitive for that role
- **AND** the primitive keeps typography, spacing, and ornament behavior consistent across routes

##### Example:

- **GIVEN** `/overview` needs a playback-density hero region and `/settings/playback` needs an admin-density control region
- **WHEN** both routes render through the shared shell
- **THEN** they consume shared title and section primitives
- **AND** they differ only by declared density variant instead of duplicated shell markup

#### Scenario: Shared shell styling changes

- **WHEN** the shared shell token or primitive styling is adjusted
- **THEN** the change propagates to every route that uses the shared contract
- **AND** the implementation does not require one-off per-page fixes for the same shell rule

##### Example:

- **GIVEN** the header spacing or footer navigation height is updated to better match `docs/reference/kuozui-green-fhd-html-prototype/styles/shell.css`
- **WHEN** the shared shell files are edited
- **THEN** `/overview`, `/settings/mqtt`, and `/device-status` all inherit the new spacing
- **AND** no page keeps a stale local copy of the old shell rule

### Requirement: Verify the shell contract on at least one playback route and one management route

The rollout SHALL verify the shared shell contract on at least one playback route and one management route before downstream page batches continue.

#### Scenario: Shell verification gate is evaluated

- **WHEN** the team claims Phase 1 is complete
- **THEN** at least one playback route and one management route are rendered through the updated shell
- **AND** the verification record includes build output and manual shell comparison notes

##### Example:

- **GIVEN** `/overview` and `/settings/playback` are the chosen verification routes
- **WHEN** Phase 1 ends
- **THEN** both routes show the same header, footer, page number, and content canvas family
- **AND** the evidence bundle records the build command and screenshot comparison for those two routes
