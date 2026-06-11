## ADDED Requirements

### Requirement: Display editor recomputes only active surfaces

The system SHALL limit editor recompute to the active workspace, page, selection, and changed regions.

#### Scenario: Inactive workspace does not resolve the full editor graph

- **WHEN** the operator is viewing a non-editor workspace without returning to the editor workspace
- **THEN** the editor does not resolve the full editor-region graph for the inactive surface
- **AND** it keeps only the data needed for the active visible surface

##### Example: asset workspace skips editor region graph

- **GIVEN** the URL is `/display-pages/editor?page=overview&workspace=assets`
- **WHEN** the asset workspace is active without an editor return context
- **THEN** the active-surface region graph flag SHALL be false
- **AND** the editor does not call the full `resolveDisplayEditorRegions` path for that inactive editor surface

#### Scenario: Preview and inspector recompute only for the active selection

- **WHEN** the operator changes one active selection while staying on the same page and workspace
- **THEN** the editor recomputes only the preview and inspector data needed for that active selection
- **AND** it does not rebuild unrelated editor regions unnecessarily

##### Example: preview is gated by editor workspace

- **GIVEN** preview rendering is enabled and the active workspace is `editor`
- **WHEN** the selected region changes from one Overview region to another
- **THEN** preview and inspector inputs are derived from the active `selectedRegion`
- **AND** preview content SHALL NOT render while the active workspace is `assets` or `shell`

### Requirement: Display editor support panels reuse warm state and isolate failures

The system SHALL let asset, publishing, and health panels reuse warm state and isolate panel refresh failures from the editable draft.

#### Scenario: Warm panel state survives a tab switch

- **WHEN** the operator returns to a panel that already loaded usable support data earlier in the session
- **THEN** the editor restores the warm panel state immediately
- **AND** it refreshes the panel in the background without clearing draft or selection state

##### Example: publish panel reuses page-scoped state

- **GIVEN** the publish panel already loaded validation and fallback state for `overview`
- **WHEN** the operator switches away and then returns to the publish tab
- **THEN** the publish panel reads the warm `publishingStateByPage["overview"]`
- **AND** the background refresh updates only the publish panel lane

#### Scenario: Panel refresh failure keeps the draft usable

- **WHEN** a panel refresh fails after the panel already had usable warm state
- **THEN** the panel exposes only its own degraded or error state
- **AND** the draft, selection, and other panels remain usable

##### Example: health refresh error does not clear report

- **GIVEN** the asset health panel has a usable report from an earlier load
- **WHEN** a later asset health refresh fails
- **THEN** the hook sets the health panel error message
- **AND** it SHALL NOT clear the warm health report, editable draft, or current selection
