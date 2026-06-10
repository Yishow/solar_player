## ADDED Requirements

### Requirement: Display editor route entry renders before deferred editor data

The system SHALL keep /display-pages/editor route entry responsive by separating editor frame rendering from deferred registry, draft config, asset list, asset health, publishing state, preview, and inspector calculations.

#### Scenario: Editor frame appears before deferred data completes

- **WHEN** an operator navigates to /display-pages/editor and deferred editor data is still loading
- **THEN** the editor route SHALL render the management-scale editor frame, workspace/page controls, and an explicit loading or degraded state
- **AND** it SHALL NOT wait for image assets, asset health, publishing state, preview rendering, and inspector validation to all finish before showing the route

#### Scenario: Registry snapshot is reused during editor entry

- **WHEN** a display page registry snapshot is already available from shared cache or route initialization
- **THEN** DisplayPagesEditorRoute SHALL build page definitions from that snapshot without starting from an empty registry state

### Requirement: Display editor draft config hydration avoids repeated full-object work

The system SHALL hydrate draft display page config without requiring full config stringify comparison on every render. Dirty tracking, save, undo, redo, reset paths, fallback policy, conflict handling, and validation state SHALL remain correct.

#### Scenario: Draft dirty state updates through editor actions

- **WHEN** an operator edits a field, resets a field, saves a draft, receives a save conflict, undoes, or redoes an editor change
- **THEN** the editor SHALL update dirty state according to the same observable behavior as before the optimization
- **AND** it SHALL NOT require a full JSON serialization of the current and last-loaded config on every render to decide that state

#### Scenario: Draft config failure keeps seed fallback visible

- **WHEN** draft config hydration fails for the selected page
- **THEN** the editor SHALL keep the seed fallback session usable
- **AND** it SHALL expose the existing errorMessage and fallback policy behavior

### Requirement: Display editor heavy work is staged by active workspace and tab

The system SHALL defer editor work that is not needed for the active workspace, active tab, selected page, or selected region. Image asset loading, asset options, asset health, publishing state, source panel data, health panel data, preview rendering, and inspector validation SHALL run only when their corresponding surface is active or explicitly required.

#### Scenario: Asset workspace loads image assets on demand

- **WHEN** an operator opens the editor but has not selected the asset workspace or a field requiring asset selection
- **THEN** the editor SHALL NOT block route entry on the full image asset list
- **AND** the asset workspace SHALL load and render the image list when activated

#### Scenario: Preview and inspector outputs remain equivalent

- **WHEN** preview rendering and inspector calculations run for the same selected page, config, workspace, tab, and region as before the optimization
- **THEN** the resulting authorable region ids, labels, geometry, field values, dirty indicators, validation issues, selection behavior, and canvas overlays SHALL match the pre-optimization output

### Requirement: Display editor optimization preserves authoring functionality and errors

The system SHALL preserve all DisplayPagesEditor authoring behavior while optimizing loading. Page switching, typed inspector controls, canvas drag/resize/nudge/measure, geometry clipboard, asset selection return, shell workspace hydration, save, publish, conflict handling, display sync refresh, and diagnostics SHALL remain observable.

#### Scenario: Deferred editor load fails without losing authoring state

- **WHEN** a deferred image, asset health, publishing, source, preview, or shell workspace request fails
- **THEN** the editor SHALL keep the current editable draft state usable
- **AND** it SHALL expose the existing error or degraded state for that deferred surface
- **AND** it SHALL NOT treat the failure as a successful load

#### Scenario: Existing editor workflows remain available

- **WHEN** an operator edits a region, moves or resizes a canvas object, copies geometry, selects an asset and returns, switches to shell workspace, saves, publishes, or handles a conflict
- **THEN** the workflow SHALL remain available with the same persisted result, selection behavior, success feedback, and error feedback as before the optimization
