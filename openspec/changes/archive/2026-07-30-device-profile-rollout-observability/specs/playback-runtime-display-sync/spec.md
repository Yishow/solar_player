## ADDED Requirements

### Requirement: Profile version sync uses a Safe Playback Boundary

A Profile Version notification SHALL stage a candidate update and SHALL NOT force an immediate playback reload. Visible route reconciliation SHALL occur only after the candidate is validated and the Safe Playback Boundary is reached.

#### Scenario: Publish arrives during a page

- **WHEN** a Client receives a new Desired Version midway through a valid page
- **THEN** no immediate window reload occurs
- **AND** the Client changes Version at the defined boundary

##### Example: Overview has five seconds remaining

- **GIVEN** Version 7 is playing Overview with 5,000 ms remaining
- **WHEN** Version 8 arrives and still contains Overview
- **THEN** the Client keeps Version 7 for those 5,000 ms without calling window reload
- **AND** applies Version 8 at the following playback boundary
