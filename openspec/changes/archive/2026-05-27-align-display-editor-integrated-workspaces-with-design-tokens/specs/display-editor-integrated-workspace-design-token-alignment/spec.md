## ADDED Requirements

### Requirement: Align integrated display editor workspaces to semantic design tokens

The system SHALL align `/display-pages/editor` and its integrated workspaces to semantic design tokens rather than route-local hardcoded styling. Shared surfaces such as context boards, detail boards, rails, sticky action areas, and status states SHALL use the same token language across page authoring, asset workspace, and shell workspace.

#### Scenario: Operator switches between editor workspaces

- **WHEN** the operator switches between page authoring, asset library, and shell decoration workspaces inside `/display-pages/editor`
- **THEN** the major surface rhythm, borders, radii, shadows, and status states remain visually consistent
- **AND** those surfaces are driven by semantic token roles instead of isolated page-local values

##### Example: Asset workspace and shell workspace read as the same product surface family

- **GIVEN** the operator opens the integrated asset workspace and then the integrated shell workspace
- **WHEN** both surfaces render their context and action boards
- **THEN** they use a shared design-token language for boards, states, and actions
- **AND** they do not read as unrelated temporary pages

### Requirement: Integrated workspaces provide actionable context instead of placeholder chrome

The integrated asset workspace and shell workspace SHALL provide actionable context, including the current editing target, selected item detail, primary actions, return path, and blocked-state explanations. These workspaces SHALL NOT collapse into empty or low-information placeholder surfaces.

#### Scenario: Operator opens the asset workspace to replace the current background

- **WHEN** the operator enters the asset workspace from a background replacement flow
- **THEN** the workspace shows the current replacement context, the currently selected asset detail, and the primary apply-and-return action
- **AND** any blocked or unavailable action explains why it cannot proceed

##### Example: Integrated asset workspace remains operationally rich

- **GIVEN** the operator is replacing the Overview hero asset
- **WHEN** they open the integrated asset workspace
- **THEN** the workspace identifies the Overview hero context
- **AND** it exposes selection, apply, and return actions without requiring a separate settings page

### Requirement: Preserve workflow contracts while aligning the surfaces

The system SHALL preserve the existing workflow contracts for apply-and-return, return-to-editor, source-connection jumps, and shell draft preservation while the integrated surfaces are visually aligned.

#### Scenario: Operator applies an asset and returns to editing

- **WHEN** the operator selects a managed asset in the integrated workspace and chooses the primary return action
- **THEN** the asset is applied to the active editing target
- **AND** the editor returns to the prior page or shell editing context
- **AND** the current draft and selection state remain intact

##### Example: Visual alignment does not break shell draft continuity

- **GIVEN** the operator is editing shell decorations inside the integrated shell workspace
- **WHEN** they switch through the asset workspace and return
- **THEN** the shell draft and selected object remain recoverable
- **AND** the aligned UI does not reset that authoring session

### Requirement: Keep compatibility entry routes as editor handoffs rather than standalone destinations

The system SHALL treat `/settings/assets` and `/shell-decorations/editor` as compatibility entry routes into `/display-pages/editor` workspaces. Those routes SHALL preserve the integrated editor workflow and SHALL NOT be restored as primary management-footer destinations.

#### Scenario: Operator enters asset authoring from the legacy assets route

- **WHEN** the operator opens `/settings/assets`
- **THEN** the route hands off into the integrated asset workspace inside `/display-pages/editor`
- **AND** the operator lands inside the same product surface family as the main editor
- **AND** the management footer does not present `/settings/assets` as a first-class destination again

##### Example: Compatibility routing preserves the integrated editor model

- **GIVEN** the product keeps old deep links or bookmarks for asset and shell authoring
- **WHEN** those entry routes are opened
- **THEN** they continue to work as handoffs into the editor workspace
- **AND** the aligned design does not regress back to separate standalone pages
