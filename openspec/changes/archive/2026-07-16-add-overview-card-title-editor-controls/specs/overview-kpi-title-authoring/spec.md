## ADDED Requirements

### Requirement: Author Overview KPI card titles independently

The system SHALL expose a page-scoped title override field for each of the five Overview KPI cards in the display editor. Each field SHALL update the matching card entry in the existing Overview display-page draft configuration and SHALL flow through the existing draft preview, save, publish, and playback configuration channel.

#### Scenario: Operator edits one Overview KPI card title

- **WHEN** the operator selects an Overview KPI card and enters a non-blank title override
- **THEN** the draft configuration stores the override under that selected card
- **AND** the draft preview displays the override without changing the other four card titles

##### Example: Power card title is edited independently

- **GIVEN** the Overview power card has no title override
- **WHEN** the operator enters "即時發電功率" in the power card title field
- **THEN** the draft stores "即時發電功率" at kpiCards.power.titleOverride
- **AND** the today, total, co2Today, and co2Total title overrides remain unchanged

#### Scenario: Published title appears in playback

- **WHEN** an Overview draft with a non-blank KPI title override is published
- **THEN** Overview playback displays that override for the matching card
- **AND** the card metric value, unit, subtitle, footer, icon, and data binding remain unchanged

### Requirement: Empty or legacy title configuration preserves the runtime metric label

The system SHALL treat a missing, empty, or whitespace-only Overview KPI title override as unset. When the override is unset, preview and playback SHALL display the existing runtime metric label, including its MQTT/story custom display name or built-in fallback.

#### Scenario: Legacy config has no title override

- **WHEN** the system loads an Overview configuration created before title overrides existed
- **THEN** all five KPI cards load without migration errors
- **AND** each card displays its existing runtime metric label

#### Scenario: Operator clears a title override

- **WHEN** the operator saves an empty or whitespace-only title override
- **THEN** preview and playback display the existing runtime metric label
- **AND** the card heading is not blank
