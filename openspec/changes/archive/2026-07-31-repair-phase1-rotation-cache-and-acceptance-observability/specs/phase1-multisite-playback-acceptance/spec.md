## MODIFIED Requirements

### Requirement: Verify fifty paired Clients through public seams

The Phase 1 acceptance harness SHALL create at least 50 Devices through Management APIs, pair them through token exchange, request authenticated Story and Rotation data, and connect their Sockets. At least 25 Devices SHALL use cl and at least 25 SHALL use kn. Heartbeat and Time Signal evidence SHALL be attributed per Client, and the harness SHALL fail when any connected Client is missing either signal, even when the aggregate count satisfies the cohort total.

#### Scenario: Run the full cohort

- **WHEN** the acceptance command runs against an isolated Server
- **THEN** all 50 Clients complete pairing, authenticated playback requests, heartbeat, and Time Signal receipt
- **AND** the command reports zero failures

#### Scenario: One Client never receives a Time Signal

- **WHEN** the cohort total of received Time Signals reaches the Client count but at least one connected Client received none
- **THEN** the acceptance command reports a failure naming the uncovered Client count
- **AND** the command exits non-zero

##### Example: aggregate total hides an uncovered Client

- **GIVEN** 50 connected Clients and 55 received Time Signals in total
- **WHEN** one Client accounts for 6 of them and one Client accounts for 0
- **THEN** the command fails because Time Signal coverage is 49 of 50, not because the total is below its minimum

### Requirement: Enforce bounded heartbeat, Time Signal, and rotation evaluation rates

Each connected Client SHALL emit at most one heartbeat per 10 seconds. The Server SHALL emit one immediate Time Signal and at most one periodic Signal per Client per 30 seconds. An unchanged Profile and Site cohort SHALL cause at most one full Effective Rotation evaluation per revision. This bound SHALL hold for cohorts served from a published Playback Profile Version as well as for cohorts served from the Default Profile, and every full Effective Rotation evaluation SHALL be counted in the evaluation counter that the acceptance seam reports. The harness SHALL sample the evaluation counter after a Profile Version is published and again after the steady-state window ends.

#### Scenario: Ten-minute steady-state run

- **WHEN** 50 Clients run for 10 minutes without a relevant revision change
- **THEN** the output remains within the heartbeat and Time Signal rates
- **AND** full rotation evaluation count grows by cohort revision, not by Device count
- **AND** retained active connection entries do not grow after reconnects settle

#### Scenario: Cohort served from a published Profile Version

- **WHEN** a Profile Version is published and every Client in one Site cohort requests playback runtime data without an intervening revision change
- **THEN** the reported Effective Rotation evaluation count grows by at most one for that cohort
- **AND** the acceptance command fails when the count instead grows once per request

##### Example: fifty runtime requests after publishing one Version

- **GIVEN** 25 kn Clients sharing one published Profile Version and an evaluation counter reading 4
- **WHEN** each of the 25 Clients requests playback runtime data once
- **THEN** the counter reads 5, not 29
