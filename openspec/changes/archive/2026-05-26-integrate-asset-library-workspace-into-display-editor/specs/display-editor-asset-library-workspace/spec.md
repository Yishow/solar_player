## ADDED Requirements

### Requirement: Expose asset library management inside Display Pages Editor

The system SHALL expose Asset Library management as an integrated workspace within `/display-pages/editor`. Operators SHALL be able to browse, upload, inspect, and select managed display assets without leaving the Display Pages Editor route.

#### Scenario: Operator opens the asset workspace from the editor

- **WHEN** the operator opens `/display-pages/editor` and switches to the asset library workspace
- **THEN** the editor shows the managed asset gallery inside the same route
- **AND** the page authoring context remains recoverable without navigating to a separate full-page settings surface

##### Example: Background replacement keeps editor context

- **GIVEN** the operator is editing the Overview page background
- **WHEN** they open the asset library workspace to choose a replacement image
- **THEN** the gallery opens inside `/display-pages/editor`
- **AND** returning from the gallery preserves the Overview editing context

### Requirement: Provide editor-grade gallery controls and usage visibility

The integrated asset workspace SHALL provide category filtering, search, upload entry, thumbnail browsing, asset preview, reference counts, usage locations, and delete guard messaging. Assets that are still referenced by page or shell configuration SHALL NOT be deletable without an explicit blocked-state explanation.

#### Scenario: Operator inspects an asset used by display pages

- **WHEN** the operator selects an asset in the integrated gallery
- **THEN** the workspace shows where that asset is used
- **AND** the delete action is disabled or blocked when active references exist
- **AND** the blocked state explains the dependent page or shell usages

##### Example: Shell ornament asset cannot be silently deleted

- **GIVEN** an ornament image is used by Shared Shell Decorations
- **WHEN** the operator selects that image in the editor asset workspace
- **THEN** the usage panel lists the shell decoration reference
- **AND** the delete action is blocked with an explanation
