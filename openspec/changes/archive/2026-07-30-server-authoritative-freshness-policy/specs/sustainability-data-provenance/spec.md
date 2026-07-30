## ADDED Requirements

### Requirement: Sustainability identifies delayed, stale, and historical values

Sustainability runtime data SHALL retain the sourceTimestamp and Server freshness state for every last-known value. Non-live values SHALL use the required semantic label and SHALL suppress live visual claims.

#### Scenario: Last-known cumulative value becomes historical

- **WHEN** a cumulative Sustainability value crosses historicalAfterMs
- **THEN** the page displays Historical snapshot and the complete source time
- **AND** it stops live pulse and current-value wording while retaining the numeric snapshot
