## MODIFIED Requirements

### Requirement: MQTT management components are structured into modular units under 400 lines
The MQTT connection and operations management UI SHALL be decoupled into named, single-responsibility controller/hooks and view components for broker settings, source mode, topic operations, card data, weather, and surface composition. Every source file created or refactored for this MQTT management surface SHALL contain fewer than 400 physical lines, and the refactor SHALL preserve the existing routes, API calls, surface variants, dirty-state guards, polling behavior, callback semantics, and stable DOM selectors.

#### Scenario: Codebase inspection of refactored MQTT management modules
- **WHEN** the source files created or refactored by this change are checked after the controller and content split
- **THEN** every checked source file contains fewer than 400 physical lines
- **AND** each module has one named interaction, state, or presentation responsibility rather than containing a relocated monolithic component

#### Scenario: Existing MQTT surfaces remain compatible
- **WHEN** the full, connections-only, and operations-only MQTT surfaces are rendered and exercised after the split
- **THEN** their API requests, visible controls, dirty-state protection, polling lifecycle, disabled states, and `data-mqtt-*` selectors retain their pre-change behavior
