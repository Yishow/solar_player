## ADDED Requirements

### Requirement: MQTT operations and topic workspace adopt fluid responsive card layout
The MQTT topic mappings and card data override management workspace SHALL render using fluid, auto-sizing container layouts instead of fixed-dimension absolute canvas coordinates. The workspace SHALL support searching, creating, editing, and deleting mappings, as well as publishing test values and applying display overrides with full visual responsiveness.

#### Scenario: Operator manages topic mappings in operations sub-surface
- **WHEN** the operator opens the advanced MQTT operations workspace
- **THEN** the mapping rows and card data rows expand fluidly to fill the available container width
- **AND** interactive actions (publish test values, apply overrides, edit topics) remain immediately accessible without canvas clipping

### Requirement: MQTT management components are structured into modular units under 400 lines
The MQTT connection and operations management UI SHALL be decoupled into single-responsibility components (such as dedicated Broker form, connection status card, and topic operations view) where each source file is maintained under the 400-line constraint.

#### Scenario: Codebase inspection of MQTT and Data Hub management components
- **WHEN** the management UI code files are checked
- **THEN** all newly created and refactored components for connections, broker forms, status cards, and topic operations strictly satisfy the file length and modularity constraints
