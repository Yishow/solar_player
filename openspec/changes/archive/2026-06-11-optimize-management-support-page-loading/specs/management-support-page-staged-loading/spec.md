## ADDED Requirements

### Requirement: Management support pages render primary state before deferred sources

The system SHALL keep support and diagnostics management routes responsive by rendering primary route state before deferred history aggregates, diagnostics, preview catalogs, reconnect loops, or full profile lists finish.

#### Scenario: Support page route shell appears while deferred sources are pending

- **WHEN** an operator navigates to EnergyTrend, EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, or BrandAssets and one or more deferred sources are pending
- **THEN** the route SHALL render its primary shell, known data, or explicit loading state
- **AND** it SHALL NOT require all deferred sources to finish before the route appears

#### Scenario: SlideshowPreview renders rotation before preview catalog completes

- **WHEN** SlideshowPreview has rotation state but live display preview catalog is still loading
- **THEN** the page SHALL render rotation status and controls
- **AND** preview cards SHALL show existing loading states until catalog entries resolve

### Requirement: Management support loaders preserve partial source state

The system SHALL preserve successful source data when another independent deferred source is pending or fails. EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, and BrandAssets SHALL update each independent source without clearing unrelated usable state.

#### Scenario: EnergyHistory handles partial source completion

- **WHEN** history snapshots, daily summaries, and cumulative counters do not resolve at the same time
- **THEN** each successful source SHALL remain available to the page state
- **AND** missing sources SHALL be represented as loading or degraded state instead of zero-valued successful data

#### Scenario: DeviceStatus handles independent diagnostics

- **WHEN** device status succeeds but log export metadata or display ops summary is still pending or fails
- **THEN** the device status section SHALL remain visible
- **AND** the failed or pending diagnostic section SHALL expose its own loading, error, or access denied state

#### Scenario: BrandAssets shows initial profile before full list refresh

- **WHEN** a cached or loader-provided active brand profile exists and the full profile list is still loading
- **THEN** BrandAssets SHALL render that active profile state first
- **AND** full profile list refresh SHALL update state without overwriting dirty local edits

### Requirement: Management support optimization preserves behavior and errors

The system SHALL preserve existing support and diagnostics behavior while optimizing loading. History charts and counters, device safe operations, log export access denied states, offline retry and reconnect, slideshow controls, preview card statuses, brand dirty blocker, upload, crop, delete, save, and display sync refresh SHALL remain observable.

#### Scenario: Deferred support source failure surfaces an error

- **WHEN** a deferred history, diagnostics, preview catalog, reconnect, or profile list request fails
- **THEN** successful unrelated state SHALL remain visible
- **AND** the failed source SHALL expose the existing error, access denied, or degraded state
- **AND** the failure SHALL NOT be reported as a successful refresh

#### Scenario: Complete payload output remains unchanged

- **WHEN** EnergyTrend, EnergyHistory, DeviceStatus, OfflineError, SlideshowPreview, or BrandAssets receives the same complete source data as before the optimization
- **THEN** the resulting view model output, chart values, counters, status labels, controls, and action feedback SHALL match the pre-optimization behavior

#### Scenario: Access and safe operation boundaries remain intact

- **WHEN** management-only diagnostics or device safe operation data is unavailable or access denied
- **THEN** the route SHALL keep the existing explicit denied or unavailable feedback
- **AND** it SHALL NOT expose restricted payloads or enable unsafe device actions
