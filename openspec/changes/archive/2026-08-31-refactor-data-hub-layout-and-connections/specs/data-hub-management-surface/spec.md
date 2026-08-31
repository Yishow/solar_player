## ADDED Requirements

### Requirement: Data Hub provides unified fluid shell layout without redundant sub-page headers
The Data Hub workspace SHALL render a single cohesive PageScaffold header containing the Data Hub title, sub-navigation tabs, and management scope selector. Sub-pages inside Data Hub SHALL NOT render redundant duplicate page-level title blocks and SHALL adopt fluid responsive containers aligning with the management shell.

#### Scenario: Operator views any Data Hub sub-page
- **WHEN** an operator navigates across any Data Hub sub-page (`Connections`, `Sources`, `Metrics`, `Derived Metrics`, `Usage`, `Diagnostics`, `External Data`)
- **THEN** the top PageScaffold header provides the primary title and navigation context
- **AND** the active sub-page renders its actions and content cards without duplicate secondary page headings

### Requirement: Data Hub Connections surface presents a fluid two-column layout for Broker configuration and health diagnostics
The Data Hub `Connections` surface SHALL render in a fluid responsive two-column grid. The left column SHALL display the MQTT broker connection settings form and data mode toggle, and the right column SHALL display the real-time connection status, test feedback diagnostics, and quick links to related Data Hub views. All action controls SHALL be integrated into the standard header toolbar or card action areas without fixed absolute canvas positioning.

#### Scenario: Operator manages Central MQTT Broker connection
- **WHEN** the operator accesses the `Connections` section of Data Hub
- **THEN** the broker configuration form and live connection health diagnostics appear side-by-side in a responsive layout
- **AND** test connection and save settings buttons are accessible in the standard action toolbar
- **AND** no content elements overlap the PageScaffold header or drift outside the viewport
