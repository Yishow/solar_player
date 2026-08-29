## ADDED Requirements

### Requirement: Dual Visual Theme Support
The Web Console SHALL support switching between Dark Tech (`data-theme="dark"`) and Clean Light (`data-theme="light"`) visual themes. The selected theme SHALL be persisted in browser `localStorage` and restored upon subsequent page loads.

#### Scenario: Switch from dark theme to light theme
- **WHEN** user clicks the theme toggle button while in dark mode
- **THEN** document root theme attribute changes to `data-theme="light"` and preference is saved to `localStorage`

#### Scenario: Restore saved theme on page initialization
- **WHEN** page loads and `localStorage` contains a saved theme preference
- **THEN** document root theme attribute is initialized with the saved theme

### Requirement: Dual Layout Mode Support
The Web Console SHALL support switching between Split Grid mode (both factories displayed side by side) and Factory Tabs mode (tabbed interface displaying one selected factory at a time). The selected layout mode SHALL be persisted in browser `localStorage`.

#### Scenario: Toggle layout mode from split grid to tabs
- **WHEN** user selects Factory Tabs layout mode
- **THEN** the console view switches to single-factory tabbed view showing active factory and preserves active telemetry data

#### Scenario: Toggle factory tab in tabs mode
- **WHEN** user clicks a factory tab button (e.g. "CL") in Factory Tabs mode
- **THEN** the view updates to display the selected factory dashboard and controls

### Requirement: Real-Time Summary KPI Metrics
The Web Console SHALL display structured summary KPI metric cards for each factory, showing Total Power in kW, Today Generation in MWh, Month Generation in MWh, and Total Lifetime Generation in MWh, aligned with terminal display formatting.

#### Scenario: Update summary KPIs on incoming summary telemetry
- **WHEN** a new `${prefix}/${factoryId}/summary` message arrives
- **THEN** the factory KPI cards update to display formatted numerical values for Total Power, Today, Month, and Total generation

### Requirement: Comprehensive 8-Column Zone Grid with Dynamic Discovery
The Web Console SHALL render all 8 zone fields in a structured table for each factory: Zone ID, Zone Name, Power (kW), Today (kWh), Month (MWh), Total (MWh), Capacity (kWp), and Today Hours (h). When telemetry for an unseen `zone_id` arrives under `${prefix}/${factoryId}/zone/#`, the table SHALL dynamically add a new row in ascending order by Zone ID.

#### Scenario: Receive telemetry for a newly added zone
- **WHEN** an MQTT message arrives for `${prefix}/${factoryId}/zone/3` for a factory that previously had only zones 1 and 2
- **THEN** the UI dynamically creates a new row for Zone 3 in the zone table ordered after Zone 2

#### Scenario: Update existing zone metrics in-place
- **WHEN** an MQTT message arrives with updated values for an existing zone
- **THEN** the corresponding table row updates its cell values in-place without resetting table structure

### Requirement: Hardened Security and Control Contract Preservation
The Web Console SHALL preserve all existing control correlation tokens (`cmd/get-config`, `cmd/set`, `state/config`, `state/control-result`, `requestId`, `ttlSeconds`), credential memory-only isolation, non-persistent credential inputs, and subscription lifecycle resets on error or disconnect as verified by backend test suites.

#### Scenario: Unload and error lifecycle reset
- **WHEN** the MQTT client encounters an error or disconnects
- **THEN** the console resets subscription status indicators and guards against credential leakage in DOM attributes

### Requirement: Interactive Config JSON Viewer and Editor
The Web Console SHALL display the remote configuration JSON (`solar/{factoryId}/state/config`) in the Operations Drawer with support for both structured field editing and raw JSON editing modes. Changes made in JSON editing mode SHALL be validated and submitted via the existing `cmd/set` control protocol.

#### Scenario: View formatted config JSON
- **WHEN** user loads configuration for a factory via `cmd/get-config`
- **THEN** the received config JSON is formatted and displayed in the JSON viewer/editor area.

#### Scenario: Edit and submit changes via JSON editor
- **WHEN** user modifies configuration values in JSON mode and clicks Save
- **THEN** the JSON is validated and transmitted via `cmd/set` with the standard control envelope.
