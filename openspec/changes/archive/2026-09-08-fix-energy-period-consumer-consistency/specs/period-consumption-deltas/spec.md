## ADDED Requirements

### Requirement: Daily coverage uses admissible time-bounded period evidence

Monthly dailyCoverage SHALL count only completed daily windows supported by eligible energy evidence no later than the request's asOf instant. Each counted day SHALL obey the same boundary-age, source identity, revision, epoch, measurement-kind and discontinuity rules as its daily consumption calculation. Input ordering SHALL NOT change coverage. Whole-month consumption and its daily allocation coverage SHALL remain independent facts.

#### Scenario: R8 meter replacement does not prove a covered day
- **WHEN** a day opens with one meter epoch and closes with a replacement epoch without reviewed continuity evidence
- **THEN** the daily result remains partial or unavailable and that day is excluded from coveredDays even when both timestamps are close to the calendar boundaries

#### Scenario: R8 later stored samples cannot inflate historical coverage
- **WHEN** a September result is requested as of September 10 while the database already contains valid samples through September 30
- **THEN** days ending after the asOf instant do not count as covered, while totalDays continues to describe the calendar month's length

#### Scenario: R8 ordering and invalid resets are handled consistently
- **WHEN** the same samples arrive in a different input order or a daily interval contains an unexplained cumulative decrease
- **THEN** reordering does not change coverage and the invalid-reset day is not counted as covered

#### Scenario: R8 known month endpoints coexist with daily gaps
- **WHEN** valid continuous month endpoints establish 1000 kWh but intermediate daily boundaries are missing
- **THEN** the month can report 1000 kWh with incomplete daily coverage without inventing daily allocations
