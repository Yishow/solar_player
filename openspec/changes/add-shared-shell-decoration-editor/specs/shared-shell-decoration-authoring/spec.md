## ADDED Requirements

### Requirement: Provide a dedicated authoring surface for shared shell decoration objects
The system SHALL provide a dedicated management authoring surface for shared shell decoration objects so operators can edit the global header and footer decoration config without opening any individual display page editor. The authoring surface SHALL preview the shared shell at FHD geometry and SHALL read and save the shared shell `draft` channel.

#### Scenario: Operator edits shared shell decorations without selecting a display page
- **WHEN** the operator opens the shared shell decoration editor
- **THEN** the editor loads the shared shell decoration draft
- **AND** the editor does not require the operator to choose an individual display page first

##### Example: Header line is edited from the shared shell editor
- **GIVEN** the shared shell draft contains one header line object
- **WHEN** the operator opens the shared shell decoration editor
- **THEN** the line appears in the shell preview and object list
- **AND** the editor does not show a display page selector as the source of truth for that object

### Requirement: Shared shell decoration authoring includes object list selection and ordering controls
The system SHALL let operators manage shared shell decoration objects through an object list grouped by `header` and `footer`. The list SHALL support direct selection, deletion, visibility toggles, lock toggles, and z-order controls so small shell objects remain manageable even when the preview is crowded.

#### Scenario: Operator reorders and hides a footer object from the list
- **WHEN** the operator changes a footer object's order or visibility from the object list
- **THEN** the preview updates to match that new list state
- **AND** the selected object remains stable across the reorder action

##### Example: Footer ornament is moved behind a line and hidden
- **GIVEN** the footer object list contains a line object and an ornament image object
- **WHEN** the operator moves the ornament behind the line and toggles it hidden
- **THEN** the preview reflects the new z-order first and then removes the ornament from view
- **AND** the line object remains visible and selected

### Requirement: Shared shell decoration authoring publishes independently from display pages
The system SHALL save and publish shared shell decoration drafts independently from any display page draft or publish workflow. Publishing the shell decoration config SHALL only affect the shared shell live contract and SHALL NOT publish or overwrite display page drafts.

#### Scenario: Publishing shell decorations leaves display page drafts untouched
- **WHEN** the operator publishes a valid shared shell decoration draft
- **THEN** the shared shell `live` config is updated
- **AND** no individual display page draft or live config is changed as a side effect

##### Example: Publishing a header line does not publish an Overview draft
- **GIVEN** the Overview page has unsaved or unpublished draft changes
- **AND** the shared shell draft contains a valid new header line object
- **WHEN** the operator publishes the shared shell decoration draft
- **THEN** the shared shell live config includes the new header line
- **AND** the Overview draft remains in its previous state
