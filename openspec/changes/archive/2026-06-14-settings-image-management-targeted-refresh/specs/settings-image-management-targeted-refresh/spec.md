## ADDED Requirements

### Requirement: Image Management keeps the selected baseline while mutation diagnostics refresh

The system SHALL keep the selected image, selected playlist row, and known library baseline in place while mutation-related diagnostics refresh.

#### Scenario: Metadata save refreshes diagnostics without clearing the selected baseline

- **WHEN** the operator saves metadata for the selected image or playlist row
- **THEN** the page keeps the selected baseline visible
- **AND** it refreshes only the affected diagnostics or selected-entity payload instead of cold-bootstrapping the full page

#### Scenario: Upload or set-cover refresh keeps the library usable

- **WHEN** the operator uploads a new image or sets a cover image
- **THEN** the page keeps the known library usable during follow-up refresh
- **AND** it updates only the selected entity or affected diagnostics that depend on the mutation

#### Scenario: Playlist governance save refreshes only the affected governance lane

- **WHEN** the operator saves playlist governance changes for the selected playlist row
- **THEN** the page keeps the selected image, selected playlist row, and known library baseline visible
- **AND** it refreshes only the governance lane and dependent diagnostics that changed instead of cold-bootstrapping the full page
