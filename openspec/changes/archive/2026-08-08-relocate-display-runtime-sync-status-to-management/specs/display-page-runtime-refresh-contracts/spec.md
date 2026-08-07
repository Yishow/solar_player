## MODIFIED Requirements

### Requirement: Surface common stale and error semantics after runtime refresh failure

The system SHALL surface common stale, error, and fallback semantics after runtime refresh failure. Playback display surfaces SHALL NOT render any banner, overlay, or other status layer for a failed runtime refresh; the failure SHALL be reported to management through the display client heartbeat instead.

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

## ADDED Requirements

### Requirement: Retry failed display runtime refresh with bounded backoff

Display page runtime sources SHALL retry automatically after a failed load, using an exponential backoff whose delay is capped at a fixed upper bound, until a load succeeds or the source is torn down. The backoff sequence SHALL reset after a successful load. Any newly started load, whether triggered by a display sync event, a refresh key change, or an explicit refresh, SHALL cancel a pending retry before starting so that retries do not accumulate.

Runtime sources that are not display page runtime sources SHALL NOT retry automatically and SHALL NOT report display runtime sync state.

#### Scenario: Transient bootstrap failure recovers without a display sync event

- **WHEN** a display page runtime source fails on its first load and no display sync event arrives afterwards
- **THEN** the source SHALL retry on the backoff schedule
- **AND** a later successful retry SHALL clear the degraded state without any operator action

#### Scenario: Backoff delay is capped and resets after success

- **WHEN** a display page runtime source fails repeatedly
- **THEN** the retry delay SHALL grow exponentially up to the fixed cap and SHALL NOT exceed it
- **AND** after the next successful load the retry delay SHALL return to the first value in the sequence

##### Example: Backoff delays across consecutive failures

| Consecutive failure | Retry delay |
| ------------------- | ----------- |
| 1st | 2 seconds |
| 2nd | 4 seconds |
| 3rd | 8 seconds |
| 4th | 16 seconds |
| 5th | 32 seconds |
| 6th and later | 60 seconds |

#### Scenario: A new load cancels the pending retry

- **WHEN** a retry is scheduled and a display sync event, refresh key change, or explicit refresh starts a new load
- **THEN** the pending retry SHALL be cancelled before the new load starts
- **AND** only the newly started load SHALL be in flight

#### Scenario: Management runtime sources are unaffected

- **WHEN** a runtime source that is not a display page runtime source fails to load
- **THEN** the source SHALL NOT schedule an automatic retry
- **AND** the source SHALL NOT record any display runtime sync state
