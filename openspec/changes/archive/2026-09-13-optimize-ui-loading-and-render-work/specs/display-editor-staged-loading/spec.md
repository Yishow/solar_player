## MODIFIED Requirements

### Requirement: Display editor route entry renders before deferred editor data

The system SHALL keep /display-pages/editor route entry responsive by separating editor frame rendering from deferred registry, draft config, asset list, asset health, publishing state, preview, and inspector calculations. The route SHALL expose pending and retryable error states without bypassing existing access and unlock gates.

#### Scenario: Editor frame appears before deferred data completes

- **WHEN** an operator navigates to /display-pages/editor and deferred editor data is still loading
- **THEN** the editor route SHALL render the management-scale editor frame, workspace/page controls, and an explicit loading or degraded state
- **AND** it SHALL NOT wait for image assets, asset health, publishing state, preview rendering, and inspector validation to all finish before showing the route

#### Scenario: Registry snapshot is reused during editor entry

- **WHEN** a display page registry snapshot is already available from shared cache or route initialization
- **THEN** DisplayPagesEditorRoute SHALL build page definitions from that snapshot without starting from an empty registry state

#### Scenario: Cold entry and failed route expose a recoverable state

- **WHEN** route code or required workspace data is pending or fails
- **THEN** the operator SHALL see a named loading state or error with a retry action instead of an empty route
- **AND** retry SHALL retain any existing dirty session and preserve the existing lazy chunk recovery policy

#### Scenario: Existing access boundaries remain effective

- **WHEN** the existing gate requires unlock or the configured route is hidden
- **THEN** the route SHALL retain its unlock or redirect behavior without rendering the protected workspace
- **AND** route fallback SHALL NOT initiate registry, draft, image, health, or shell-workspace data requests
- **AND** resource clients SHALL retain the existing management access-denied handling and server authorization boundary

### Requirement: Display editor heavy work is staged by active workspace and tab

The system SHALL defer editor work that is not needed for the active workspace, active tab, selected page, or selected region. Image asset loading, asset options, asset health, publishing state, source panel data, health panel data, preview rendering, and inspector validation SHALL run only when their corresponding surface is active or explicitly required. Workspace content SHALL NOT wait for an unrelated page draft or independent diagnostic request.

#### Scenario: Asset workspace loads image assets on demand

- **WHEN** an operator opens the editor but has not selected the asset workspace or a field requiring asset selection
- **THEN** the editor SHALL NOT block route entry on the full image asset list
- **AND** the asset workspace SHALL load and render the image list when activated

#### Scenario: Preview and inspector outputs remain equivalent

- **WHEN** preview rendering and inspector calculations run for the same selected page, config, workspace, tab, and region as before the optimization
- **THEN** the resulting authorable region ids, labels, geometry, field values, dirty indicators, validation issues, selection behavior, and canvas overlays SHALL match the pre-optimization output

#### Scenario: Workspace state owns deferred failures and retries

- **WHEN** workspace data is pending or rejected after the lightweight route entry completes
- **THEN** the mounted workspace SHALL own the resource loading, error, and retry state
- **AND** resource failure SHALL NOT be swallowed as success or remount an unrelated dirty workspace through the route error boundary
- **AND** retry SHALL request only the failed resource through the existing client/cache boundary

#### Scenario: Assets remain usable while health is pending or failed

- **WHEN** the assets workspace has received its image model and asset health is pending or failed
- **THEN** the image list and permitted selection actions SHALL be usable with an independent health pending or error state
- **AND** opening that workspace without an editor return context SHALL NOT require an unrelated selected-page draft response

#### Scenario: Shell entry avoids unrelated page hydration

- **WHEN** an operator enters the shell workspace directly
- **THEN** shell content readiness SHALL depend on its shell draft and existing access requirements
- **AND** it SHALL NOT depend on receiving a selected-page draft that the shell workspace does not use

#### Scenario: Workspace return preserves an existing draft

- **WHEN** an operator enters assets from a dirty editor field and returns, or switches between editor and shell
- **THEN** the original draft, dirty baseline, undo history, return target, and owner isolation SHALL remain intact
- **AND** a cold editor draft SHALL remain non-editable until its authoritative initial baseline is available

#### Scenario: Shared loading remains deduplicated and generation aware

- **WHEN** route preload and mounted workspace request the same resource generation, or an older workspace request resolves after switching
- **THEN** the existing shared in-flight request SHALL be reused
- **AND** an obsolete owner or generation response SHALL NOT overwrite the active workspace
