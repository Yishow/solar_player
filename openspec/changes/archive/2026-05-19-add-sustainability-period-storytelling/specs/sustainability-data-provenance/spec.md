## ADDED Requirements

### Requirement: Keep data provenance as first-class presentation data in Sustainability

The system SHALL keep data provenance, update time, and sync state as first-class presentation data for Sustainability indicators.

#### Scenario: Sustainability indicator has provenance metadata

- **WHEN** a Sustainability indicator is rendered with provenance metadata
- **THEN** the page can display its source or update state alongside the value
- **AND** missing provenance does not break rendering

##### Example: Annual energy saving card shows source timestamp

- **GIVEN** the annual energy saving indicator includes source name and last-updated metadata
- **WHEN** the Sustainability page renders that indicator
- **THEN** the card can show the value plus provenance or sync state
- **AND** it still renders safely if only part of the provenance payload is available

### Requirement: Expose Sustainability provenance to management or diagnostics surfaces

The system SHALL expose Sustainability provenance to surfaces that inspect content health or readiness.

#### Scenario: Management surface inspects Sustainability source state

- **WHEN** a management or diagnostic surface requests Sustainability summary data
- **THEN** it can inspect provenance and sync state for the rendered indicators

##### Example: Management route sees that total generation is stale

- **GIVEN** the total generation indicator was last updated outside the acceptable freshness window
- **WHEN** a management or diagnostic surface requests Sustainability summary data
- **THEN** it can inspect that stale sync state together with the provenance metadata
