## ADDED Requirements

### Requirement: Expose Shared Shell Decorations authoring inside Display Pages Editor

The system SHALL expose Shared Shell Decorations authoring as an integrated workspace within `/display-pages/editor`. Operators SHALL be able to edit header and footer shell decoration objects without navigating to a separate canonical full-page shell editor route.

#### Scenario: Operator opens shell decorations from the editor

- **WHEN** the operator opens `/display-pages/editor` and switches to the shell decorations workspace
- **THEN** the editor shows the shared shell decoration canvas, object list, and inspector inside the same route
- **AND** the workspace uses the full shell preview including header and footer areas

##### Example: Header ornament editing stays in the editor route

- **GIVEN** the operator needs to adjust a header ornament
- **WHEN** they open the shell decorations workspace
- **THEN** the browser remains on `/display-pages/editor`
- **AND** the operator can select and edit the header ornament in the integrated shell preview

### Requirement: Preserve separate shell draft and publish lifecycle

The integrated shell workspace SHALL preserve the shared shell decoration draft/live lifecycle. Shell save and publish actions SHALL use shell decoration APIs, and page save or publish actions SHALL NOT publish shell decoration drafts.

#### Scenario: Operator publishes shell decorations from the integrated workspace

- **WHEN** the operator changes a shell decoration object and clicks publish in the shell workspace
- **THEN** the shell decoration live config is updated through the shell publish flow
- **AND** the current display page draft is not published by that action

##### Example: Page draft remains pending after shell publish

- **GIVEN** the Overview page has unsaved page draft changes
- **AND** the shell workspace has a modified footer line
- **WHEN** the operator publishes the shell workspace
- **THEN** the footer line becomes live
- **AND** the Overview page draft remains unpublished
