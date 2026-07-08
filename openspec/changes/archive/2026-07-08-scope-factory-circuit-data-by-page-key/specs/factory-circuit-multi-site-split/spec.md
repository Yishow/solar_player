## MODIFIED Requirements

### Requirement: Site-Specific Load Visibility and Geometry Configuration
The system MUST support site-specific configurations and data scope for load rows:
- The Jungli site (page key `factory-circuit`) SHALL have `stamping`, `body`, `painting`, `assembly`, `utility`, and `office` slots visible and data-scoped, while `heavy_vehicle` and `ed_coating` are hidden and SHALL NOT be required for Jungli aggregate power.
- The Guanyin site (page key `factory-circuit-guanyin`) SHALL have all 8 slots visible and data-scoped.
- The 8-row layout for Guanyin site MUST use a compact arrangement with row height 65px and vertical step 74px to fit inside the FHD canvas without overlapping lower KPI cards.

#### Scenario: Rendering and aggregating the load panel for Jungli site
- **WHEN** the Jungli site page configuration and story are resolved
- **THEN** only the 6 standard rows SHALL be displayed on the load panel
- **AND** the vertical spacing SHALL use the standard layout (height: 84px, step: 95px)
- **AND** the current factory total power SHALL sum only the 6 Jungli-scoped slots

##### Example: Jungli aggregate ignores Guanyin-only slots
- **GIVEN** Jungli scoped slot values are `10`, `20`, `30`, `40`, `50`, and `60` kW
- **AND** Guanyin scoped `heavy_vehicle` and `ed_coating` values are `700` and `800` kW
- **WHEN** the Jungli Factory Circuit story is resolved
- **THEN** current factory total power SHALL be `210` kW

#### Scenario: Rendering and aggregating the load panel for Guanyin site
- **WHEN** the Guanyin site page configuration and story are resolved
- **THEN** all 8 rows SHALL be displayed on the load panel
- **AND** the vertical spacing SHALL use the compact layout (height: 65px, step: 74px)
- **AND** the current factory total power SHALL sum all 8 Guanyin-scoped slots

##### Example: Guanyin aggregate includes all Guanyin slots
- **GIVEN** Guanyin scoped slot values are `1`, `2`, `3`, `4`, `5`, `6`, `7`, and `8` kW
- **WHEN** the Guanyin Factory Circuit story is resolved
- **THEN** current factory total power SHALL be `36` kW

## ADDED Requirements

### Requirement: Factory Circuit story resolves by page key
The system SHALL resolve Factory Circuit story payloads by Factory Circuit page key.

#### Scenario: Jungli and Guanyin story routes use different circuit scopes
- **WHEN** the browser or playback runtime requests `/api/display-story/factory-circuit`
- **THEN** the returned Factory Circuit story SHALL use only circuits scoped to `factory-circuit`
- **WHEN** the browser or playback runtime requests `/api/display-story/factory-circuit-guanyin`
- **THEN** the returned Factory Circuit story SHALL use only circuits scoped to `factory-circuit-guanyin`

### Requirement: Factory Circuit metric keys are page-scoped
The system SHALL resolve Factory Circuit slot metric keys by Factory Circuit page key and slot key.

#### Scenario: Same engineering slot exists in multiple sites
- **WHEN** Jungli and Guanyin both bind a `stamping` slot
- **THEN** the Jungli slot SHALL use a Jungli metric key
- **AND** the Guanyin slot SHALL use a distinct Guanyin metric key
- **AND** MQTT live values for the two slots SHALL NOT overwrite each other
