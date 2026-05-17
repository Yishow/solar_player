## ADDED Requirements

### Requirement: Persist display page component editing configuration for all five display pages

The system SHALL persist structured display page component editing configuration for `Overview`, `Solar`, `Factory Circuit`, `Images`, and `Sustainability`, and SHALL fall back to approved seed values when persisted configuration is missing, incomplete, or unavailable.

#### Scenario: Stored configuration exists for a display page

- **WHEN** the editor or runtime loads configuration for one of the five display pages
- **THEN** the system returns the stored structured settings for that page
- **AND** the page applies those settings without requiring source-code edits

##### Example: one page overrides only part of the seed values

- **GIVEN** the stored `Solar` config changes one flow-node position and keeps all other regions untouched
- **WHEN** the `Solar` page loads through the editor or runtime
- **THEN** the stored node position is used
- **AND** all untouched regions continue using their seed-backed values

#### Scenario: Stored configuration cannot be used

- **WHEN** the stored configuration for a display page is missing, incomplete, or cannot be loaded
- **THEN** the system falls back to the approved seed values for that page
- **AND** the display route still renders a valid playback layout

### Requirement: Support phased display page component editing rollout across all five display pages

The display page component editing capability SHALL cover all five display pages in this change and SHALL roll out by explicit page phases rather than requiring every page-specific editor to be completed in the same implementation step.

#### Scenario: The rollout sequence is applied

- **WHEN** implementation work proceeds through this change
- **THEN** the editor foundation is completed first
- **AND** page-specific editors are delivered in ordered phases for `Overview`, `Solar`, `Factory Circuit`, `Images`, and `Sustainability`

##### Example: page phases remain explicit

- **GIVEN** `Overview` and `Solar` are already editable
- **WHEN** `Factory Circuit` editor work starts
- **THEN** the implementation does not reopen foundation behavior as a generic redesign
- **AND** the next work stays focused on `Factory Circuit` page-specific regions

### Requirement: Make Overview display page component editing support hero copy, hero media, and KPI cards

The `Overview` display page component editing capability SHALL make the three-part slogan, hero image, hero container geometry, and KPI card geometry editable through the editor.

#### Scenario: An operator edits Overview hero and KPI regions

- **WHEN** the operator selects an `Overview` slogan, hero, or KPI region and saves a change
- **THEN** the saved configuration updates the editor preview and the production `Overview` playback route
- **AND** the route keeps the existing playback shell and live metric fallback behavior

### Requirement: Make Solar display page component editing support hero, flow nodes, connectors, and KPI cards

The `Solar` display page component editing capability SHALL make the solar hero, flow nodes, connectors, and KPI card geometry editable through the editor.

#### Scenario: An operator edits Solar flow composition

- **WHEN** the operator selects a `Solar` flow node, connector, hero, or KPI region and saves a change
- **THEN** the saved configuration updates the editor preview and the production `Solar` playback route
- **AND** the route keeps the existing playback shell and solar live metric behavior

### Requirement: Make Factory Circuit display page component editing support copy, nodes, connectors, and load rows

The `Factory Circuit` display page component editing capability SHALL make the title or copy regions, status block, nodes, connectors, and load-row layout editable through the editor.

#### Scenario: An operator edits Factory Circuit load composition

- **WHEN** the operator selects a `Factory Circuit` node, connector, status, or load-row region and saves a change
- **THEN** the saved configuration updates the editor preview and the production `Factory Circuit` playback route
- **AND** the route keeps the existing playback shell and load-data rendering behavior

### Requirement: Make Images display page component editing support the media stage, info panel, thumb grid, and arrows

The `Images` display page component editing capability SHALL make the title or copy regions, main media stage, info panel, thumbnail grid, and arrow positions editable through the editor.

#### Scenario: An operator edits Images gallery composition

- **WHEN** the operator selects an `Images` media-stage, info, thumb, or arrow region and saves a change
- **THEN** the saved configuration updates the editor preview and the production `Images` playback route
- **AND** the route keeps the existing slideshow asset and image-selection behavior

### Requirement: Make Sustainability display page component editing support hero, KPI or stat cards, and the highlight rail

The `Sustainability` display page component editing capability SHALL make the title or copy regions, hero, KPI or stat cards, and highlight rail editable through the editor.

#### Scenario: An operator edits Sustainability hero and bottom statistics

- **WHEN** the operator selects a `Sustainability` hero, KPI card, stat card, or highlight-rail region and saves a change
- **THEN** the saved configuration updates the editor preview and the production `Sustainability` playback route
- **AND** the route keeps the existing playback shell and storytelling-number rendering behavior
