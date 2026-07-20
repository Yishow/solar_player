## ADDED Requirements

### Requirement: Use one selected period across Sustainability runtime blocks

The implementation SHALL make the `/sustainability` playback route use one selected period from the shared story runtime across big numbers, highlight rail, and other periodized runtime blocks.

#### Scenario: Operator switches Sustainability period

- **WHEN** the selected Sustainability period changes on the playback page
- **THEN** all periodized runtime blocks re-resolve from that same shared story period
- **AND** the page does not mix mock or lifetime data into only part of the runtime story

##### Example: Month view updates all periodized playback blocks together

- **GIVEN** the playback page changes from `lifetime` to `month`
- **WHEN** `/sustainability` resolves the shared story payload for the month period
- **THEN** the big numbers and highlight rail both use month data
- **AND** the page does not keep showing lifetime values in one block while the other uses month values
