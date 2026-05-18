## ADDED Requirements

### Requirement: Integrate Image Management with display page references

The system SHALL integrate `Image Management` with display page and slideshow references so operators can see where each asset is used.

#### Scenario: Operator inspects image references

- **WHEN** an operator selects an image in `Image Management`
- **THEN** the UI shows which display pages or slideshow entries currently reference that asset
- **AND** it distinguishes draft references from live references when both exist

### Requirement: Surface image deletion or replacement blockers from display references

The system SHALL surface blockers when an image deletion or replacement would affect active display references.

#### Scenario: Live display page still references selected image

- **WHEN** the selected image is still referenced by a live display page or active slideshow entry
- **THEN** `Image Management` surfaces that blocker or warning before destructive action proceeds
