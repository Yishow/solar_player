## MODIFIED Requirements

### Requirement: Compose Sustainability story modules from configurable content blocks

The system SHALL treat Sustainability story modules such as ESG summaries, milestones, and procurement narratives as persisted configurable content blocks rather than fixed page-local literals.

#### Scenario: Editorial module is updated without changing numeric aggregates

- **WHEN** an operator updates a Sustainability story module
- **THEN** the page uses the persisted updated module content
- **AND** the numeric aggregates remain independently sourced from their runtime contracts

##### Example: Procurement narrative changes without touching big numbers

- **GIVEN** the Sustainability page shows procurement copy from a persisted story module
- **WHEN** an operator updates that procurement module text
- **THEN** the updated narrative appears on the page
- **AND** the accumulated generation and CO2 cards remain sourced from their numeric runtime payload
