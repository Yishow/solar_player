## MODIFIED Requirements

### Requirement: Derive household-equivalent cards from measured self-consumption

The system SHALL derive Sustainability household-equivalent cards from measured energy data and a declared calculation profile instead of hand-authored household counts.

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

#### Scenario: Cumulative household-equivalent card resolves from active factory cumulative generation

- **WHEN** the Sustainability runtime resolves the active factory generation scope and its cumulative MQTT summary is fresh
- **THEN** the `cumulative` household-equivalent card derives its household count from the scoped measured cumulative generation and the selected calculation profile's daily household usage basis
- **AND** the card keeps cumulative equivalence separate from the current-day card
- **AND** the card does not substitute an unrelated global cumulative counter when the scoped summary is unavailable
