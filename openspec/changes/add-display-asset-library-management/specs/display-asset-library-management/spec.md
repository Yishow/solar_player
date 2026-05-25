## ADDED Requirements

### Requirement: Asset library management organizes display assets by category and usage scope
The system SHALL provide a dedicated display asset library management surface that organizes managed assets by category and usage scope. The first release SHALL support `background`, `object`, and `icon` categories and SHALL let operators filter the catalog by at least `shell-only`, `page-only`, or `both` usage scope.

#### Scenario: Operator switches between category tabs
- **WHEN** the operator opens the asset library management surface and changes category tabs
- **THEN** the asset list updates to show only assets from the selected category
- **AND** the current usage-scope filters remain understandable to the operator

##### Example: Object tab shows only object-category assets
- **GIVEN** the catalog contains background, object, and icon assets
- **WHEN** the operator selects the `object` tab
- **THEN** the list shows only object-category assets
- **AND** each row still indicates whether the asset is usable for shell, page, or both

### Requirement: Asset library management assigns category and usage scope during upload
The system SHALL assign category and usage scope metadata during asset upload or import so new assets enter the catalog with usable picker metadata from the start. Uploads SHALL NOT silently create catalog entries without category or usage-scope information.

#### Scenario: Operator uploads a new object asset with explicit metadata
- **WHEN** the operator uploads a new asset through the asset library management surface
- **THEN** the upload flow asks for or applies category and usage-scope metadata
- **AND** the completed asset appears in the catalog under the expected category tab

##### Example: SVG ornament uploads into the object category
- **GIVEN** the operator uploads an SVG ornament intended for page decorations
- **WHEN** the operator marks it as category `object` with usage scope `page-only`
- **THEN** the uploaded asset appears in the `object` tab
- **AND** page-object pickers can use it without waiting for a second metadata-edit step

### Requirement: Asset library management reports cross-surface usage before destructive actions
The system SHALL report where a managed asset is used across display page media, shared shell decorations, and page freeform objects before destructive actions are allowed. When an asset is still referenced, the management surface SHALL block silent deletion and SHALL show the referencing locations.

#### Scenario: Operator tries to delete an asset that is still referenced
- **WHEN** the operator requests deletion for a managed asset that is still referenced by shell or page config
- **THEN** the delete action is blocked
- **AND** the management surface shows the referencing shell or page locations

##### Example: Shell ornament asset is still used in the footer
- **GIVEN** an ornament asset is referenced by one shared footer decoration object
- **WHEN** the operator attempts to delete that asset from the asset library
- **THEN** the delete action is blocked
- **AND** the usage report identifies the shared footer decoration reference
