## MODIFIED Requirements

### Requirement: Surface common stale and error semantics after runtime refresh failure

The system SHALL surface common stale, error, and fallback semantics after runtime refresh failure. Playback display surfaces SHALL NOT render any banner, overlay, or other status layer for a failed runtime refresh; the failure SHALL be reported to management through the display client heartbeat instead.

Runtime outcomes SHALL be recorded per display page runtime source, keyed by that source's page key, so that a later outcome from a different page does not overwrite an earlier one. A source that reports without a page key SHALL leave every recorded outcome unchanged.

Because the heartbeat carries a single runtime sync state, the recorded outcomes SHALL be reduced to one reported value in this order: the most recently recorded `degraded` outcome if any page is degraded; otherwise the most recently recorded `loading` outcome if any page is loading; otherwise the most recently recorded `synced` outcome; otherwise `unknown` with a null page key, null timestamp, and null error message. The reported page key SHALL always be the page key of the outcome that was selected, so that management reads the page that is actually failing rather than the page that loaded last.

A `loading` outcome SHALL NOT carry an error message from an earlier failure. Both `loading` and `degraded` outcomes SHALL retain the timestamp of that page's last successful sync, because that timestamp remains true regardless of the current state.

#### Scenario: Refresh failure preserves fallback-safe rendering

- **WHEN** a page-specific runtime refresh fails after the page has already rendered once
- **THEN** the page SHALL keep the last fallback-safe rendering contract instead of crashing
- **AND** the page SHALL NOT render a banner, overlay, or other status layer describing the failure

##### Example: Sustainability keeps last resolved period after refresh failure

- **GIVEN** `Sustainability` already rendered the `year` period successfully
- **WHEN** the next period refresh fails because the story endpoint is unavailable
- **THEN** the page keeps the last fallback-safe `year` rendering contract
- **AND** the rendered surface contains no failure banner or overlay

#### Scenario: Runtime refresh outcome is reported to management instead of the playback surface

- **WHEN** a display page runtime source resolves successfully or fails
- **THEN** the outcome SHALL be recorded as a display runtime sync state, the last successful sync timestamp, and the last error message
- **AND** the recorded values SHALL be carried by the display client heartbeat so management surfaces can read them

##### Example: Runtime sync state by outcome

| Runtime outcome | Reported state | Last successful sync timestamp | Last error message |
| --------------- | -------------- | ------------------------------ | ------------------ |
| No display runtime source has reported yet | `unknown` | null | null |
| A load is in flight and no prior success exists | `loading` | null | null |
| Load resolved successfully | `synced` | ISO timestamp of that success | null |
| Load failed and the page fell back | `degraded` | ISO timestamp of the last prior success, or null | the failure message |

#### Scenario: A rotating client keeps reporting the page that failed

- **GIVEN** one display page runtime source has failed and recorded a `degraded` outcome
- **WHEN** rotation moves to a different display page whose runtime source then resolves successfully
- **THEN** the reported runtime sync state SHALL remain `degraded`
- **AND** the reported page key SHALL be the page key of the failing source, not the page that resolved last
- **AND** the reported error message SHALL be the failing source's error message

#### Scenario: A recovered page stops being reported as degraded

- **GIVEN** a display page runtime source has recorded a `degraded` outcome and no other page is degraded
- **WHEN** that same source later resolves successfully
- **THEN** the reported runtime sync state SHALL be `synced`
- **AND** the reported error message SHALL be null

#### Scenario: A load in flight does not carry an earlier error message

- **GIVEN** a display page runtime source has recorded a `degraded` outcome with an error message
- **WHEN** that source starts another load and no other page is degraded
- **THEN** the reported runtime sync state SHALL be `loading`
- **AND** the reported error message SHALL be null
- **AND** the reported timestamp SHALL still be that source's last successful sync timestamp
