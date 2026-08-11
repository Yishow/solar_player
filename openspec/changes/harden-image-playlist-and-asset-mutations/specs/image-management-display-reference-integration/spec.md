## ADDED Requirements

### Requirement: Image deletion keeps the catalog and served file namespace consistent

Deleting an unreferenced image SHALL coordinate filesystem and database mutations so a failure cannot leave the catalog deleted while the original public upload URL still serves the orphaned file.

#### Scenario: File cannot be staged for deletion

- **WHEN** an image is otherwise deletable but its file cannot be moved out of the served uploads namespace
- **THEN** the delete operation SHALL fail before changing playlist or asset rows
- **AND** the original catalog record and file URL SHALL remain intact

#### Scenario: Database deletion fails after the file is staged

- **WHEN** the image file has been staged outside the served namespace but the database transaction fails
- **THEN** the system SHALL restore the file to its original location
- **AND** the asset and playlist database rows SHALL remain unchanged

#### Scenario: Final tombstone cleanup fails after database commit

- **WHEN** the database deletion commits but final removal of the staged tombstone fails
- **THEN** the original public upload URL SHALL remain unavailable
- **AND** the system SHALL record a bounded cleanup-pending diagnostic for later retry
