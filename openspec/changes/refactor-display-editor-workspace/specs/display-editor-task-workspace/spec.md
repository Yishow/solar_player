## ADDED Requirements

### Requirement: Pages tools and persistent actions have distinct locations
<!-- requirement-id: U3-R1 -->

The editor SHALL separate page selection from workspace tools and SHALL keep undo, redo, draft-save, preview and publish-check actions visible while editing. Action availability and dirty/save state SHALL be explicit.

#### Scenario: Save while inspecting data
<!-- scenario-id: U3-R1-S01 -->

- **GIVEN** a bound card is selected and the data panel is open
- **WHEN** the operator saves
- **THEN** save is available without opening a separate left actions tab

#### Scenario: Load or save failure
<!-- scenario-id: U3-R1-S02 -->

- **GIVEN** the server rejects a save
- **WHEN** the toolbar updates
- **THEN** the error and unsaved state remain visible and editing is not discarded

### Requirement: Selection exposes only relevant capabilities without hiding constraints
<!-- requirement-id: U3-R2 -->

The inspector SHALL prioritize controls for the selected stable item and explain unsupported operations. Advanced geometry and diagnostic identifiers SHALL be available on demand. Existing editing capabilities SHALL remain reachable.

#### Scenario: Select image
<!-- scenario-id: U3-R2-S01 -->

- **GIVEN** an editable image is selected
- **WHEN** the inspector updates
- **THEN** asset and image controls are shown rather than unrelated metric fields

#### Scenario: Fixed template region
<!-- scenario-id: U3-R2-S02 -->

- **GIVEN** a region does not permit free layer reordering
- **WHEN** the operator examines it
- **THEN** the constraint is stated and no non-functional drag affordance suggests otherwise

### Requirement: Panel layout does not change authored geometry
<!-- requirement-id: U3-R3 -->

Panels SHALL be collapsible or resizable and the canvas SHALL retain aspect-preserving coordinates. Resizing the workspace or changing zoom SHALL not mutate stored object positions. Pointer actions SHALL have keyboard or numeric alternatives.

#### Scenario: Resize inspector
<!-- scenario-id: U3-R3-S01 -->

- **GIVEN** a configured object is selected
- **WHEN** the inspector width changes
- **THEN** its stored position and size stay identical

#### Scenario: Small desktop
<!-- scenario-id: U3-R3-S02 -->

- **GIVEN** the viewport is 1366x768
- **WHEN** both panels would crowd the canvas
- **THEN** a collapse/drawer layout leaves editing and primary actions reachable

### Requirement: Asset selection returns to the same editing context
<!-- requirement-id: U3-R4 -->

Opening and closing an asset picker SHALL preserve page, selected item, zoom and unsaved edits. Applying an asset SHALL update only the selected draft path unless the operator explicitly chooses a shared change.

#### Scenario: Cancel asset selection
<!-- scenario-id: U3-R4-S01 -->

- **GIVEN** the operator has an unsaved text change and opens an image picker
- **WHEN** they cancel
- **THEN** the text edit, selected item and zoom remain unchanged

#### Scenario: Apply image
<!-- scenario-id: U3-R4-S02 -->

- **GIVEN** an image is chosen for a specific card
- **WHEN** the picker completes
- **THEN** the card draft updates and the operator remains in the same page context

### Requirement: Shared shell changes expose separate scope and save state
<!-- requirement-id: U3-R5 -->

The shared header/footer workspace SHALL disclose affected page scope and its own draft/save state. Page-save SHALL not falsely report a shared-shell change as saved, nor shall shared-shell save imply page publication.

#### Scenario: Unsaved shell decoration
<!-- scenario-id: U3-R5-S01 -->

- **GIVEN** a shared footer and current page both have edits
- **WHEN** only the page draft is saved
- **THEN** the footer retains its separate unsaved indicator

#### Scenario: Shared scope warning
<!-- scenario-id: U3-R5-S02 -->

- **GIVEN** a common header asset is replaced
- **WHEN** confirmation appears
- **THEN** the UI states that pages using the shared header are affected

### Requirement: Navigation and remote changes preserve drafts
<!-- requirement-id: U3-R6 -->

Changing page or workspace SHALL preserve valid draft sessions or request explicit discard. Remote updates SHALL not overwrite dirty local edits. Focus and selection SHALL remain stable after validation navigation.

#### Scenario: Switch pages
<!-- scenario-id: U3-R6-S01 -->

- **GIVEN** page A has unsaved edits
- **WHEN** the operator visits B then returns to A
- **THEN** A edits remain or the earlier discard was explicitly confirmed

#### Scenario: Remote revision
<!-- scenario-id: U3-R6-S02 -->

- **GIVEN** another operator saves a newer revision while local edits are dirty
- **WHEN** the update arrives
- **THEN** the UI offers comparison/reload without overwriting the local draft

### Requirement: Selected objects expose common editing tasks directly
<!-- requirement-id: U3-R7 -->

The workspace SHALL expose supported object-context tasks for data, image, text and display settings, plus the common publish action. Site energy source editing SHALL open the shared U6 setup and preserve page draft/selection. It SHALL not expose duplicate profile-owned numerator/denominator inputs in generic inspector fields.

#### Scenario: Image task
<!-- scenario-id: U3-R7-S01 -->

- **GIVEN** an editable image is selected
- **WHEN** 更換圖片 is activated
- **THEN** the asset picker opens inline and returns to the same selection without changing workspace

#### Scenario: Energy task
<!-- scenario-id: U3-R7-S02 -->

- **GIVEN** a department share is selected
- **WHEN** 修改用電來源與占比 is activated
- **THEN** the user reaches the shared site-and-department context without finding DataHub manually
