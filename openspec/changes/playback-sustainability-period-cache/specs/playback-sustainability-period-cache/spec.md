## ADDED Requirements

### Requirement: Sustainability reuses a warm payload for the selected period

The system SHALL let Sustainability reuse a warm payload for a previously resolved period before issuing a background refresh.

#### Scenario: Switching back to a resolved period uses the warm payload first

- **WHEN** the operator switches back to a period that was already resolved earlier in the session
- **THEN** the page restores the warm payload for that selected period immediately
- **AND** it refreshes the period data in the background without a cold visible reset

### Requirement: Sustainability keeps selected-period content stable during refresh

The system SHALL keep selected-period highlight, stat, and household-equivalent content stable while period refresh runs.

#### Scenario: Period refresh failure preserves the selected-period visible state

- **WHEN** the page already shows a selected period and a later refresh for that period fails
- **THEN** the page keeps the existing selected-period content visible
- **AND** it surfaces the existing degraded or fallback feedback instead of clearing the visible state
