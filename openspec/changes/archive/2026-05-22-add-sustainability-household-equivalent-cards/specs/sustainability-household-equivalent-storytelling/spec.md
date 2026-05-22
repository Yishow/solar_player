## ADDED Requirements

### Requirement: Derive household-equivalent cards from measured self-consumption

The system SHALL derive Sustainability household-equivalent cards from measured self-consumption data and a declared calculation profile instead of hand-authored household counts.

#### Scenario: Daily household-equivalent card resolves from daily self-consumption

- **WHEN** the Sustainability runtime reads a daily summary that includes the current day's self-consumption total
- **THEN** the `today` household-equivalent card derives its household count from that measured self-consumption and the selected calculation profile
- **AND** the card does not substitute total generation when self-consumption is unavailable

##### Example: Daily summary yields a household-equivalent headline

- **GIVEN** the current day's self-consumption total is available in the daily summary
- **AND** the selected calculation profile defines a four-person household daily bill basis
- **WHEN** the Sustainability runtime resolves the `today` household-equivalent card
- **THEN** the card outputs a headline in the form `X households of four`
- **AND** the derived result is tagged with the profile that produced it

#### Scenario: Cumulative household-equivalent card resolves from cumulative self-consumption

- **WHEN** the Sustainability runtime reads cumulative self-consumption counters
- **THEN** the `cumulative` household-equivalent card derives its household count from the measured cumulative self-consumption and the selected calculation profile's monthly household bill basis
- **AND** the card keeps cumulative equivalence separate from the current-day card

### Requirement: Keep household-equivalent assumptions visible to the operator-facing page

The system SHALL keep household-equivalent assumptions, profile identity, and disclaimer text available to the operator-facing Sustainability page even when the headline hides the underlying currency calculation.

#### Scenario: Sustainability renders the card disclaimer

- **WHEN** a household-equivalent card is rendered on Sustainability
- **THEN** the page can show the card's disclaimer and profile-backed assumption text alongside the derived household headline
- **AND** the visible headline remains centered on household count rather than raw currency

##### Example: Headline shows households while the disclaimer names the estimate basis

- **GIVEN** a derived card uses the default four-person household profile
- **WHEN** the page renders the card
- **THEN** the main headline reads `18 households of four`
- **AND** the supporting copy can state that the estimate is based on average four-person household usage and an estimated tariff

### Requirement: Surface unavailable state when the equivalence basis is missing

The system SHALL surface an unavailable state for household-equivalent cards when the required self-consumption basis or calculation profile is missing.

#### Scenario: Daily summary is unavailable

- **WHEN** the Sustainability runtime cannot read the current day's self-consumption basis for the daily household-equivalent card
- **THEN** the card resolves to an unavailable state
- **AND** the card explains that the estimate basis is unavailable instead of silently falling back to total generation

##### Example: Missing daily self-consumption blocks the today card

- **GIVEN** the daily summary has no valid `self_consumption_total` for the current date
- **AND** the cumulative self-consumption counter is still present
- **WHEN** the Sustainability runtime resolves the `today` household-equivalent card
- **THEN** the `today` card renders an unavailable state
- **AND** the runtime does not borrow the cumulative counter or total generation to fabricate a daily household count
