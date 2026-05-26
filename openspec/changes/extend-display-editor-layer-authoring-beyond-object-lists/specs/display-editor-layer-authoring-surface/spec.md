## ADDED Requirements

### Requirement: Expose layer controls from the current selection for reorderable authoring nodes

The system SHALL expose layer controls from the current selection context for reorderable authoring nodes in `/display-pages/editor`. The operator SHALL NOT need to rely on the left object list as the only place where z-order can be changed.

#### Scenario: Operator selects a reorderable freeform object

- **WHEN** the operator selects a reorderable freeform object on the canvas
- **THEN** the editor shows layer controls for that object from the current selection context
- **AND** invoking those controls updates the same ordering state used by the object list

##### Example: Freeform object can move forward without leaving the canvas context

- **GIVEN** a page freeform object supports stacking order changes
- **WHEN** the operator selects that object and chooses a layer action
- **THEN** the object order changes immediately
- **AND** the left object list reflects the same new order

### Requirement: Explain fixed-layout regions that do not support layer authoring

The system SHALL explain when the selected region belongs to fixed page layout rather than reorderable authoring. It SHALL NOT leave the operator to infer whether layer editing is missing or merely hidden.

#### Scenario: Operator selects a fixed background region

- **WHEN** the operator selects a fixed-layout page region that does not support z-order editing
- **THEN** the editor does not show active layer controls for that region
- **AND** it explains that the region's layer is fixed by the page template

##### Example: Background region is identified as fixed-layout

- **GIVEN** a page background belongs to the template-defined layout stack
- **WHEN** the operator inspects that selection
- **THEN** the editor states that layer ordering is not editable for that region
- **AND** the absence of controls is explicit rather than silent

### Requirement: Keep parallel layer entry points synchronized

The system SHALL keep layer controls in the object list, shell object list, and current selection context synchronized. Any reorder action from one entry point SHALL update the others without divergence.

#### Scenario: Operator reorders a shell object from the inspector

- **WHEN** the operator reorders a shell decoration object from the current selection context
- **THEN** the shell object list updates to reflect the new order
- **AND** subsequent reorder actions from the list continue from the same ordering state

##### Example: Shell object order remains coherent across entry points

- **GIVEN** a shell ornament object is selected in the integrated shell workspace
- **WHEN** the operator moves it backward from the selection-side controls
- **THEN** the object list displays the updated order
- **AND** no conflicting order is shown between inspector and list
