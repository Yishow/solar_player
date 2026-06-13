## ADDED Requirements

### Requirement: Registry and live config consumers reuse shared warm cache

The system SHALL let route loaders and mounted consumers reuse the same warm registry snapshot or live config envelope before issuing a new blocking read.

#### Scenario: Warm registry snapshot seeds a mounted consumer

- **WHEN** a route loader or another mounted consumer already resolved the active display page registry snapshot
- **THEN** the next consumer initializes from that shared warm snapshot
- **AND** it does not start a duplicate blocking registry read before first render

#### Scenario: Warm live config envelope seeds the route host

- **WHEN** the live config envelope for a page is already cached
- **THEN** the route host initializes from the cached envelope for the first visible render
- **AND** it refreshes only through the explicit force-refresh or display-sync path when needed

### Requirement: Shared cache reuse preserves fallback and refresh semantics

The system SHALL preserve existing fallback, error, and force-refresh behavior when shared warm cache reuse is enabled.

#### Scenario: Refresh failure keeps the existing visible state

- **WHEN** a force refresh or display-sync refresh fails after a warm registry snapshot or live config envelope was already visible
- **THEN** the system keeps the existing visible or fallback state in place
- **AND** it surfaces the existing error semantics instead of reporting success

#### Scenario: Live-stage warm cache does not alter draft-stage behavior

- **WHEN** draft-stage consumers use the same config hook paths after live-stage warm cache reuse was introduced
- **THEN** draft-stage baseline, dirty state, save, and conflict behavior stay equivalent to the pre-change behavior
- **AND** live-stage warm cache does not leak into draft-stage editing semantics
