## ADDED Requirements

### Requirement: Overview cards match the Better reference sample for icon chips and trend form

The Overview display page SHALL treat `docs/reference/Better/01.Overivew (大).png` as a supplementary visual canonical for its KPI card icon chips and its generation trend widget form, while `docs/reference/FHD/` remains the page-level canonical for Overview. The Overview KPI card icon chips SHALL be capable of the per-card colored and rounded-square treatment shown in the Better sample, and the generation trend widget SHALL present the smooth curve with axis labels shown in the Better sample. This fidelity SHALL be expressed through Overview card-style authoring and runtime rendering rather than page-local hardcoded styles, and SHALL remain scoped to Overview-only classes so the shared card base and other playback pages are unchanged.

#### Scenario: Overview icon chips reflect the Better sample treatment

- **WHEN** `/overview` renders its KPI cards with the seed configuration aligned to the Better sample
- **THEN** the KPI card icon chips render with the per-card colored, rounded-square treatment consistent with the Better sample

#### Scenario: Overview trend widget reflects the Better sample form

- **WHEN** `/overview` renders its generation trend widget with a runtime trend series
- **THEN** the widget renders the smooth curve with axis labels consistent with the Better sample

#### Scenario: Better fidelity stays scoped to Overview

- **WHEN** the Better-aligned Overview card styling is applied
- **THEN** the shared card component base and the other playback pages render unchanged

##### Example: Shared base card stays untouched

- **GIVEN** the Overview page publishes rounded-square icon chips and the full trend chart treatment
- **WHEN** `/solar` or `/factory-circuit` renders shared cards
- **THEN** those pages do not inherit the Overview icon-chip variables or chart styling
- **AND** only Overview-specific classes carry the Better-aligned changes
