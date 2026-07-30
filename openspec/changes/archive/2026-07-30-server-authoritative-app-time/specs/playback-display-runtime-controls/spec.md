## ADDED Requirements

### Requirement: Drive playback schedules from trusted App Time

Playback schedule eligibility SHALL use Server-authoritative App Time when state is synced or stale. It SHALL freeze the last trusted eligibility result in waiting or time-untrusted while relative page rotation continues.

#### Scenario: Client OS Clock changes while App Time is synced

- **WHEN** the Raspberry Pi OS Clock moves forward or backward
- **THEN** playback schedule eligibility remains based on monotonic App Time
- **AND** the visible rotation does not jump because of the OS Clock change
