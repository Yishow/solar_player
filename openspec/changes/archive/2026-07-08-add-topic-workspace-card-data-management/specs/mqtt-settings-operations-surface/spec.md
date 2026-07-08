## ADDED Requirements

### Requirement: Combine MQTT source mode and topic controls into a three-tab Topic workspace

The system SHALL combine MQTT source mode controls and topic mapping controls into one Topic workspace with three tabs.

#### Scenario: Operator opens the merged Topic workspace

- **WHEN** the operator opens `/settings/mqtt`
- **THEN** the page SHALL present one Topic workspace container for MQTT source mode, topic mapping, and card data management
- **AND** the workspace SHALL expose exactly three tabs named `資料來源模式`, `Topic mapping`, and `卡片資料管理`
- **AND** the page SHALL NOT render MQTT source mode as a separate card outside the Topic workspace

#### Scenario: Operator switches to source mode tab

- **WHEN** the operator selects `資料來源模式`
- **THEN** the workspace SHALL show the MQTT data mode control, broker fields, connection status, test connection action, and save settings action
- **AND** existing broker runtime feedback SHALL remain visible inside the selected tab

#### Scenario: Operator switches to topic mapping tab

- **WHEN** the operator selects `Topic mapping`
- **THEN** the workspace SHALL show topic coverage findings, topic rows, add mapping, reload mappings, save mappings, and numeric topic publish controls
- **AND** existing topic row edit behavior SHALL remain available inside the selected tab

#### Scenario: Operator switches to card data management tab

- **WHEN** the operator selects `卡片資料管理`
- **THEN** the workspace SHALL show card-centric diagnostics and display override controls
- **AND** the workspace SHALL preserve unsaved broker and topic draft indicators when the operator changes tabs

### Requirement: Preserve MQTT management actions across tab navigation

The system SHALL preserve MQTT management action state across Topic workspace tab navigation.

#### Scenario: Operator edits a topic and changes tabs before saving

- **WHEN** the operator edits a topic mapping field and switches to another Topic workspace tab
- **THEN** the unsaved topic draft SHALL remain intact
- **AND** the workspace SHALL continue to identify the topic section as dirty

##### Example: Topic edit survives switching to card data management

- **GIVEN** the operator changes `realTimePower` topic from `kuozui/plant/solar/power` to `demo/solar/power`
- **WHEN** the operator switches from `Topic mapping` to `卡片資料管理` and back
- **THEN** the `realTimePower` row still contains `demo/solar/power`
- **AND** the topic section remains marked as dirty

#### Scenario: Operator tests broker connection from source mode tab

- **WHEN** the operator runs the MQTT connection test from `資料來源模式`
- **THEN** the result SHALL appear in the merged workspace
- **AND** switching tabs SHALL NOT clear the latest connection feedback

#### Scenario: Operator publishes a topic value from either data workflow

- **WHEN** the operator publishes a numeric value from `Topic mapping` or from a card diagnostic action
- **THEN** the publish request SHALL target the existing topic mapping for that metric key
- **AND** the publish result SHALL be visible without forcing a full page reload
