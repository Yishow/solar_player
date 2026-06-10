## ADDED Requirements

### Requirement: Playback route entry remains visible during runtime hydration

The system SHALL keep playback route entry responsive while live config and runtime payloads hydrate. A playback route SHALL render an existing visible state, cached live config, seed fallback, or the shared loading state without waiting for all story, playlist, circuit, or telemetry runtime payloads to finish.

#### Scenario: Route switches before background runtime payloads finish

- **WHEN** playback navigates from one enabled playback route to another enabled playback route
- **THEN** the destination route SHALL become the active route without waiting for story, playlist, circuit, or telemetry runtime payloads to finish
- **AND** the destination route SHALL render an existing visible state, cached live config, seed fallback, or the shared loading state

#### Scenario: Live config cache is reused for destination route

- **WHEN** a destination playback route has matching live config already primed by route loading or a previous successful load
- **THEN** the page SHALL initialize from that live config without issuing a duplicate blocking live config request before first render

### Requirement: Playback runtime data loads without duplicate blocking reads

The system SHALL avoid duplicate blocking registry, live config, and runtime reads across playback route loader, playback shell metadata, route host, and page hooks. Background refreshes SHALL remain allowed when they do not block the destination route from rendering an existing visible state.

#### Scenario: Registry consumers share the same active snapshot

- **WHEN** LayoutShell, DisplayPageRouteHost, playback footer metadata, and live preview route resolution need the active display page registry snapshot during a route change
- **THEN** they SHALL reuse the same active snapshot or a shared pending request instead of each starting an independent cold request

#### Scenario: Runtime refresh starts from last-known payload

- **WHEN** a story, playlist, or circuit runtime hook has a last-known payload and starts a background refresh
- **THEN** it SHALL keep exposing the last-known payload while marking refresh state
- **AND** it SHALL replace the payload only after the newer request resolves successfully

### Requirement: Playback optimization preserves functionality and errors

The system SHALL preserve all existing playback behavior while optimizing hydration. Playback transition phases, display sync refresh, loading state, runtime fallback banners, page-specific error messages, image autoplay, Factory Circuit circuit error state, and FHD render output SHALL remain observable after the optimization.

#### Scenario: Background runtime refresh fails

- **WHEN** a background story, playlist, or circuit runtime refresh fails after a previous payload exists
- **THEN** the page SHALL keep the previous payload visible
- **AND** it SHALL expose the existing error or fallback indicator for that page instead of reporting success

#### Scenario: Display sync still refreshes playback runtime

- **WHEN** a display:sync event targets display pages, playback settings, images, circuits, MQTT, or other existing playback runtime scopes
- **THEN** the same affected playback config or runtime payloads SHALL refresh according to the existing scope rules
- **AND** no existing playback page SHALL lose its refresh behavior because the load path was staged

#### Scenario: Existing playback tests remain valid

- **WHEN** the optimization is implemented
- **THEN** existing tests for display transition, runtime refresh, live config hydration, Images autoplay, and playback route metadata SHALL still pass
- **AND** new tests SHALL cover the staged hydration behavior
