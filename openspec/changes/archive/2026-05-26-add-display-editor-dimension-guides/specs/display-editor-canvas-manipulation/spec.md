## ADDED Requirements

### Requirement: Render page-aligned guide overlays in the editor viewport with design-space mapping

The system SHALL render a dashed guide overlay inside the `DisplayEditorCanvasCard` viewport whenever edit mode is enabled for a supported display page. The overlay SHALL interpret guide geometry in a configurable design space whose default size is `1920x1080`, and it SHALL map that design space into the current viewport so the guides remain aligned while the operator switches pages, zooms, or pans.

#### Scenario: Operator opens edit mode on a supported page

- **WHEN** the operator enables edit mode on a supported display page
- **THEN** the canvas shows that page's guide overlay
- **AND** the guides remain aligned with the preview content after viewport scaling, zoom, and pan actions

##### Example: Overview page keeps guides aligned after zoom

- **GIVEN** `/display-pages/editor?page=overview` is open in edit mode
- **WHEN** the operator zooms the preview to `125%` and pans the canvas
- **THEN** the hero, content, and card-band guides remain anchored to the same Overview layout positions
- **AND** no separate unscaled guide layer appears outside the preview surface

#### Scenario: Viewport is smaller than the configured design space

- **WHEN** the editor viewport is smaller than the configured design-space width or height
- **THEN** the guide overlay still renders inside the current viewport
- **AND** its labels and measurements continue to use design-space coordinates instead of raw viewport pixels

##### Example: FHD guides are mapped into a narrower preview card

- **GIVEN** the configured design space is `1920x1080`
- **AND** the current `DisplayEditorCanvasCard` viewport is rendered at half that width
- **WHEN** edit mode is active
- **THEN** the dashed guide overlay is visibly compressed into the preview card
- **AND** the guide geometry still corresponds to the original `1920x1080` layout

### Requirement: Expose overlay display modes for selected-only and full-canvas framing

The system SHALL let operators change the display editor overlay mode from the controls shown with `DisplayEditorCanvasCard`. The available modes SHALL include a selected-only mode that emphasizes only the active region and a full-canvas mode that reveals page-wide guides and reference frames for all editable regions.

#### Scenario: Operator switches from selected-only mode to full-canvas mode

- **WHEN** the operator changes the overlay mode from selected-only to full-canvas
- **THEN** the editor immediately updates the visible guides and region frames inside the same viewport
- **AND** the change does not modify any saved region geometry

##### Example: Full-canvas mode reveals all region reference frames

- **GIVEN** the editor is open with one selected hero region
- **WHEN** the operator enables full-canvas overlay mode
- **THEN** the editor shows the page-wide dashed guides
- **AND** the other editable regions gain reference frames without becoming selected

#### Scenario: Selected-only mode keeps non-selected regions passive

- **WHEN** the selected-only overlay mode is active
- **THEN** only the selected region shows the primary framing treatment
- **AND** non-selected regions do not appear with the same emphasis as the active region

##### Example: Selecting one image tile no longer frames every other tile

- **GIVEN** an `Images` page contains multiple editable tiles
- **WHEN** the operator selects a single tile while selected-only mode is active
- **THEN** the chosen tile shows the primary frame
- **AND** the remaining tiles do not receive matching full-strength selection frames

### Requirement: Persist and restore overlay guide presets

The system SHALL let operators configure guide presets from `DisplayEditorCanvasCard` controls, including design-space presets, axis or tick visibility, center-line visibility, region labels, and full-canvas frame density options. The editor SHALL restore the most recent valid preset when the operator returns to the editor.

#### Scenario: Operator changes overlay preset options

- **WHEN** the operator updates an overlay preset option from the canvas controls
- **THEN** the current viewport immediately reflects that setting
- **AND** the setting remains available when the operator returns to the editor later

##### Example: Operator keeps FHD axes and region labels enabled

- **GIVEN** the operator enables `1920x1080` design-space preset, axis ticks, and region labels
- **WHEN** the operator leaves and later reopens `Display Pages Editor`
- **THEN** the editor restores that same preset combination
- **AND** the reopened overlay shows axis ticks and region labels without requiring manual reconfiguration

#### Scenario: Editor falls back from an invalid stored preset

- **WHEN** the editor cannot parse the last stored overlay preset
- **THEN** the overlay falls back to the default preset
- **AND** the operator can continue editing without losing canvas interaction

##### Example: Broken preset storage falls back to default FHD overlay

- **GIVEN** the stored overlay preset payload is malformed
- **WHEN** the operator opens `Display Pages Editor`
- **THEN** the editor falls back to its default overlay preset
- **AND** the canvas remains interactive with the default `1920x1080` design-space settings

### Requirement: Show live dimensions for the selected canvas region

The system SHALL show live dimension feedback for the selected editable region or selected card rail child card. During drag or resize interactions, the feedback SHALL update the region size and the distances to its editable container bounds in real time using design-space values. Locked regions SHALL remain selectable but SHALL NOT enter active drag or resize measurement states.

#### Scenario: Operator drags or resizes a selected region

- **WHEN** the operator drags or resizes a selected editable region
- **THEN** the canvas shows the region width and height
- **AND** the canvas shows distances from that region to the active container bounds
- **AND** the feedback updates as the geometry changes

##### Example: Rail card measurements use the parent rail bounds

- **GIVEN** a selected card rail child is constrained by a `470` pixel wide parent rail
- **WHEN** the operator drags the card toward the right boundary
- **THEN** the measurement feedback reports distances relative to that parent rail
- **AND** the card does not report distances relative to the full page surface

#### Scenario: Operator selects a locked region

- **WHEN** the operator selects a locked region
- **THEN** the region remains selectable on the canvas
- **AND** the canvas does not enter an active drag or resize measurement state for that region

##### Example: Locked Overview hero copy stays passive

- **GIVEN** the `Overview Hero Copy` region is locked in edit mode
- **WHEN** the operator clicks that region on the canvas
- **THEN** the editor keeps that region selected
- **AND** the canvas does not start drag or resize measurements for it
