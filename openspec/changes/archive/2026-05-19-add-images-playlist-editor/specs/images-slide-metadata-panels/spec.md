## ADDED Requirements

### Requirement: Keep slide metadata separate from raw file metadata

The system SHALL keep Images slide metadata separate from raw file metadata so titles, area labels, capture dates, tags, and descriptions can survive asset replacement.

#### Scenario: Operator updates slide metadata

- **WHEN** an operator edits a slide's title, area, date, tags, or description
- **THEN** the playlist entry stores those metadata fields
- **AND** the info panel can render them for the active slide

##### Example: Operator adds area and capture date to a gallery slide

- **GIVEN** playlist entry `IMG-03` already references a valid asset
- **WHEN** the operator sets its title, area label, capture date, and description
- **THEN** those values are stored on the playlist entry
- **AND** the info panel can render them when `IMG-03` becomes active

### Requirement: Show metadata-driven info panel content in Images

The system SHALL render Images info panel content from slide metadata when metadata is available.

#### Scenario: Active slide has metadata

- **WHEN** the current Images slide has configured metadata
- **THEN** the info panel shows that metadata
- **AND** missing fields fall back predictably without breaking the panel

##### Example: Info panel omits missing tags but still shows title

- **GIVEN** the active slide has a title and area label but no tags
- **WHEN** the Images page renders the info panel
- **THEN** the panel shows the available title and area metadata
- **AND** the missing tags field falls back cleanly instead of breaking the panel layout
