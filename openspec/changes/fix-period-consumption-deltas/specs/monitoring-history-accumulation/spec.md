## MODIFIED Requirements

### Requirement: Local-day baselines are maintained per scope
<!-- requirement-id: E2-M1 -->

The consumption daily-summary baseline SHALL be persisted independently for each concrete metric scope and contributing physical meter revision/epoch. Local-day boundaries SHALL use the configured site time zone and source observation time. Restart, one site receiving a late first message, and another site crossing midnight SHALL NOT reset or substitute another baseline. Unknown baseline, reset or continuity gaps SHALL remain explicit rather than being clamped into a valid zero. Generation and other existing counter semantics SHALL remain unchanged by this consumption-specific extension.

#### Scenario: Independent midnight rollover
<!-- scenario-id: E2-M1-S01 -->

- **GIVEN** CL receives its first accepted reading after local midnight before KN
- **WHEN** CL daily consumption is processed
- **THEN** CL changes only its own period state and KN retains its independently persisted baseline

#### Scenario: Restart with consumption evidence
<!-- scenario-id: E2-M1-S02 -->

- **GIVEN** a valid consumption baseline and accepted observations exist in SQLite
- **WHEN** the server restarts in MQTT mode without a new message
- **THEN** it resumes the same period calculation and preserves the original source timestamps without inserting mock readings

#### Scenario: Unproven baseline
<!-- scenario-id: E2-M1-S03 -->

- **GIVEN** no eligible period-start observation exists for a meter
- **WHEN** the service creates a daily summary
- **THEN** the consumption result is unavailable or explicitly partial, never a valid zero or the current register
