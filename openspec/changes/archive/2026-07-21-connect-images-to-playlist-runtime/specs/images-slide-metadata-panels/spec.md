## ADDED Requirements

### Requirement: Resolve Images metadata panels from the active playlist entry

The implementation SHALL make the `/images` metadata panel, counter, and duration copy resolve from the active playlist entry returned by `/api/image-playlist`.

#### Scenario: Active playlist entry changes

- **WHEN** the active playlist entry changes because of order or index movement
- **THEN** the Images info panel and counter update to the metadata of that active entry
- **AND** they do not keep showing stale mock-only title or description fields

##### Example: Info panel follows the selected runtime entry

- **GIVEN** `/api/image-playlist` returns an active entry with title, area, captured date, tags, and duration
- **WHEN** `/images` renders the info panel
- **THEN** the panel and counter copy use that active entry metadata
- **AND** the displayed duration matches the same playlist entry that drives the main stage
