## MODIFIED Requirements

### Requirement: Keep data provenance as first-class presentation data in Sustainability

The system SHALL keep data provenance, update time, and sync state as first-class presentation data for Sustainability indicators. Derived household-equivalent cards SHALL also carry calculation-profile identity, disclaimer text, and basis-availability state as presentation metadata.

#### Scenario: Sustainability indicator has provenance metadata

- **WHEN** a Sustainability indicator is rendered with provenance metadata
- **THEN** the page can display its source or update state alongside the value
- **AND** missing provenance does not break rendering

##### Example: Annual energy saving card shows source timestamp

- **GIVEN** the annual energy saving indicator includes source name and last-updated metadata
- **WHEN** the Sustainability page renders that indicator
- **THEN** the card can show the value plus provenance or sync state
- **AND** it still renders safely if only part of the provenance payload is available

#### Scenario: Household-equivalent card exposes estimate provenance

- **WHEN** a household-equivalent card is rendered from a calculation profile
- **THEN** the page can display the profile-backed disclaimer, basis source, and availability state together with the derived household headline
- **AND** partial estimate metadata still renders as a safe degraded card instead of crashing the page

##### Example: Cumulative card shows profile identity without exposing currency as the headline

- **GIVEN** the cumulative household-equivalent card derives from cumulative self-consumption and the default four-person profile
- **WHEN** the page renders that card
- **THEN** the card can show the derived household headline plus estimate metadata such as profile label or disclaimer
- **AND** the page does not need to promote the underlying currency value into the main title row
