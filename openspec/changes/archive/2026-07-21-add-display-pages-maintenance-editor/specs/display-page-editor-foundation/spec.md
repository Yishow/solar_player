## ADDED Requirements

### Requirement: Provide a dedicated display page editor foundation route

The web application SHALL provide a dedicated display page editor route inside the management shell for editing display-page presentation settings, and the editor foundation SHALL expose navigation for all five display pages while allowing page-specific editing behavior to roll out by phase.

#### Scenario: The editor entry opens the display-page editor shell

- **WHEN** an operator navigates to the display page editor entry
- **THEN** the application renders the editor inside the management shell
- **AND** the editor shell shows navigation for `Overview`, `Solar`, `Factory Circuit`, `Images`, and `Sustainability`

##### Example: routing exposes the full rollout map

- **GIVEN** the product has five playback display pages
- **WHEN** this change is applied
- **THEN** the editor route exposes all five page entries
- **AND** each page continues following the phased rollout contract for when its editable regions become available

### Requirement: Toggle display page editor foundation mode with the E key inside the editor route

The display page editor foundation SHALL allow operators to toggle edit mode by pressing `E` while the dedicated editor route is active, and SHALL NOT require the production playback route to host the editor overlay.

#### Scenario: Edit mode is toggled in the editor route

- **WHEN** the operator presses `E` while the dedicated display page editor route is focused
- **THEN** edit mode toggles on or off for the editor canvas
- **AND** the change is scoped to the editor route rather than the production playback route

##### Example: production playback stays clean

- **GIVEN** the operator is viewing the production `/overview` playback route
- **WHEN** the operator presses `E`
- **THEN** the production route does not enter editor mode
- **AND** no editor overlay is injected into the playback-only route

### Requirement: Surface selectable editable regions with an inspector in the display page editor foundation

The display page editor foundation SHALL surface selectable editable regions on the editor canvas and SHALL present an inspector that edits the currently selected region.

#### Scenario: A region is selected from the canvas

- **WHEN** the operator selects an editable region on the editor canvas
- **THEN** the region shows an active selection state
- **AND** the inspector updates to show the fields for that region

##### Example: hero region selection updates the inspector

- **GIVEN** the editor canvas exposes the `Overview` hero container as an editable region
- **WHEN** the operator selects the hero container
- **THEN** the inspector shows the hero container fields instead of KPI card fields
- **AND** the selection state remains visible on the canvas until another region is selected or edit mode is closed
