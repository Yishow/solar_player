## ADDED Requirements

### Requirement: Reclaim App Shell caches that are no longer in use

The system SHALL reclaim App Shell caches that are neither the active cache nor the current candidate, so that cache storage on a long-running device does not grow without bound across releases.

Reclamation SHALL occur only after a candidate has been successfully committed as the active cache, so that a complete usable cache exists at every moment.

#### Scenario: A superseded release cache is reclaimed after commit

- **WHEN** a candidate App Shell cache is successfully committed as the active cache
- **AND** caches from earlier releases exist under the project cache prefix
- **THEN** those earlier caches SHALL be deleted
- **AND** the newly active cache SHALL remain complete and usable

#### Scenario: The active and candidate caches survive reclamation

- **WHEN** reclamation runs
- **THEN** the active cache SHALL NOT be deleted
- **AND** the current candidate cache SHALL NOT be deleted

#### Scenario: Commit fails and no cache is reclaimed

- **WHEN** a candidate fails validation and is not committed
- **THEN** no reclamation SHALL occur
- **AND** the existing active cache SHALL remain intact

#### Scenario: Reclamation failure does not break the commit

- **WHEN** deleting a superseded cache fails
- **THEN** the commit SHALL still be reported as successful
- **AND** the active cache SHALL remain complete and usable

##### Example: caches present across a release upgrade

| Cache | Before commit | After commit and reclamation |
| ----- | ------------- | ---------------------------- |
| release A shell (active) | present | deleted |
| release B shell (candidate) | present | present, now active |
| release-independent metadata | present | present |
