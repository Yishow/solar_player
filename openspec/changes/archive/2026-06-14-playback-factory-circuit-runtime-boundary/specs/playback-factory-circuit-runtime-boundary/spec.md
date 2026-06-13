## ADDED Requirements

### Requirement: Factory Circuit preserves last-known usable runtime state during refresh

The system SHALL preserve the last-known usable Factory Circuit runtime state while circuits or story data refresh in the background.

#### Scenario: Circuit refresh fails after usable runtime was already visible

- **WHEN** the page already has usable circuits-derived runtime state and a later refresh fails
- **THEN** the page keeps the last-known usable runtime state visible
- **AND** it surfaces the existing degraded or fallback feedback instead of clearing the page

### Requirement: Factory Circuit separates circuits refresh from story refresh

The system SHALL keep circuits-source refresh and story-source refresh on separate runtime boundaries so one source does not trigger unnecessary full-page runtime rebuilds.

#### Scenario: Story refresh updates values without rebuilding the circuits source

- **WHEN** the story payload refreshes while the circuits source stays unchanged
- **THEN** the page updates only the story-dependent runtime values
- **AND** it keeps the existing circuits-derived runtime state intact until a circuits refresh actually succeeds
