## ADDED Requirements

### Requirement: Align the factory circuit page as a standalone flow-heavy playback batch

The implementation SHALL align `/factory-circuit` as a standalone playback batch dedicated to `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html`.

#### Scenario: The factory circuit batch starts

- **WHEN** this playback batch begins
- **THEN** it only covers `/factory-circuit`
- **AND** it treats flow composition and circuit-card density as the primary alignment target

##### Example:

- **GIVEN** the earlier overview and solar batch already exists
- **WHEN** this change is applied
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` maps only to `/factory-circuit`
- **AND** no media-heavy playback page is included in the same batch

### Requirement: Preserve circuit threshold and empty-state behavior

The implementation SHALL preserve threshold-driven status mapping and empty-state behavior for `/factory-circuit`.

#### Scenario: Circuit data is present or missing

- **WHEN** the page receives circuit rows or an empty result
- **THEN** it renders a consistent status mapping and a readable fallback state
- **AND** the visual migration does not collapse the route when data is absent

##### Example:

- **GIVEN** the circuits API returns an empty list
- **WHEN** `/factory-circuit` renders
- **THEN** the route still shows its prototype-aligned sections with an intentional empty-state treatment
- **AND** it does not render broken connectors or missing labels
