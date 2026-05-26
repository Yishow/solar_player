## MODIFIED Requirements

### Requirement: Render page-aligned guide overlays in the editor viewport with design-space mapping

The system SHALL render a dashed guide overlay across the full `DisplayEditorCanvasCard` shell preview whenever edit mode is enabled for a supported display page. The overlay SHALL include header, content, and footer shell bands, SHALL interpret guide geometry in a configurable design space whose default size is `1920x1080`, and SHALL map that design space into the current viewport so the guides remain aligned while the operator switches pages, zooms, or pans.

#### Scenario: Operator opens edit mode on a supported page

- **WHEN** the operator enables edit mode on a supported display page
- **THEN** the canvas shows that page's guide overlay
- **AND** the guides remain aligned with the preview content after viewport scaling, zoom, and pan actions
- **AND** dashed shell band guides are visible in the header and footer areas of the same preview shell

##### Example: Overview page keeps guides aligned after zoom

- **GIVEN** `/display-pages/editor?page=overview` is open in edit mode
- **WHEN** the operator zooms the preview to `125%` and pans the canvas
- **THEN** the hero, content, header, and footer guides remain anchored to the same Overview shell layout positions
- **AND** no separate unscaled guide layer appears outside the preview surface

#### Scenario: Viewport is smaller than the configured design space

- **WHEN** the editor viewport is smaller than the configured design-space width or height
- **THEN** the guide overlay still renders inside the current full shell preview
- **AND** its labels and measurements continue to use design-space coordinates instead of raw viewport pixels
- **AND** header/content/footer boundary guides remain visible after scaling

##### Example: FHD guides are mapped into a narrower preview card

- **GIVEN** the configured design space is `1920x1080`
- **AND** the current `DisplayEditorCanvasCard` viewport is rendered at half that width
- **WHEN** edit mode is active
- **THEN** the dashed guide overlay is visibly compressed into the preview card
- **AND** the guide geometry still corresponds to the original `1920x1080` shell and content layout
