## ADDED Requirements

### Requirement: Resolve Sustainability provenance from the shared story runtime

The implementation SHALL make the `/sustainability` playback route resolve provenance and sync-state copy from `/api/sustainability-story` instead of keeping provenance as page-local mock-only content.

#### Scenario: Sustainability story provides provenance for the selected period

- **WHEN** `/sustainability` loads a story payload for a selected period
- **THEN** the provenance block uses that period's shared story provenance
- **AND** the page does not silently show unrelated mock provenance text

##### Example: Quarter view shows quarter provenance

- **GIVEN** `/api/sustainability-story?period=quarter` returns provenance metadata for the quarter period
- **WHEN** `/sustainability` renders the provenance area
- **THEN** the displayed source, sync state, and updated-at copy come from that shared period payload
- **AND** the rest of the page stays aligned with the same selected period
