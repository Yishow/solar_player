## ADDED Requirements

### Requirement: Verify fifty paired Clients through public seams

The Phase 1 acceptance harness SHALL create at least 50 Devices through Management APIs, pair them through token exchange, request authenticated Story and Rotation data, and connect their Sockets. At least 25 Devices SHALL use cl and at least 25 SHALL use kn.

#### Scenario: Run the full cohort

- **WHEN** the acceptance command runs against an isolated Server
- **THEN** all 50 Clients complete pairing, authenticated playback requests, heartbeat, and Time Signal receipt
- **AND** the command reports zero failures

### Requirement: Enforce bounded heartbeat, Time Signal, and rotation evaluation rates

Each connected Client SHALL emit at most one heartbeat per 10 seconds. The Server SHALL emit one immediate Time Signal and at most one periodic Signal per Client per 30 seconds. An unchanged Profile and Site cohort SHALL cause at most one full Effective Rotation evaluation per revision.

#### Scenario: Ten-minute steady-state run

- **WHEN** 50 Clients run for 10 minutes without a relevant revision change
- **THEN** the output remains within the heartbeat and Time Signal rates
- **AND** full rotation evaluation count grows by cohort revision, not by Device count
- **AND** retained active connection entries do not grow after reconnects settle

### Requirement: Prove Site isolation and identity lifecycle end to end

The harness SHALL prove that CL and KN Clients sharing one Profile receive isolated Site data, and that unpaired, disabled, revoked, and re-paired Devices produce their specified public outcomes.

#### Scenario: Revoke and re-pair one Client during cohort playback

- **WHEN** one credential is revoked and its Device is paired again
- **THEN** the old credential fails closed
- **AND** the new credential resumes the same Group and Site-scoped playback
- **AND** other Clients remain unaffected

##### Example: Re-pair one KN Client without disturbing the cohort

- **GIVEN** 25 CL and 25 KN Clients are connected, including `phase1-kn-49`
- **WHEN** management revokes that Device, confirms the old credential returns `403 credential_revoked`, then issues and exchanges a new Pairing Token
- **THEN** the new credential returns the same Device, Group, and `kn` Site context from `/api/playback/runtime`
- **AND** the other 49 Clients remain connected

### Requirement: Verify the installed thin-kiosk identity and time path

The thin-kiosk verifier SHALL read back the dedicated Firefox Profile, absence of private-window mode, Cookie persistence across Browser restart, remote Server reachability, immediate Time Signal, and Device/Time heartbeat fields.

#### Scenario: Installed kiosk lacks persistent identity

- **WHEN** the verifier cannot retain the Device Cookie across a controlled Browser restart
- **THEN** the verification fails with a named cookie-persistence check
- **AND** it does not report the kiosk as Phase 1 ready

### Requirement: Produce durable Phase 1 handoff documentation

The repository SHALL document architecture vocabulary, migration and compatibility lifecycle, pairing and credential security, Site isolation, Server Time Signal, Windows Server and Pi thin-kiosk deployment, troubleshooting, and the 50-Client test matrix.

#### Scenario: Fresh operator follows the handoff

- **WHEN** an operator uses only the named runbooks to pair a kiosk, verify time, and diagnose an offline or disabled Device
- **THEN** each action identifies the exact command or management route and the expected observable result

##### Example: Diagnose a disabled thin kiosk after reboot

- **GIVEN** the operator has only the Phase 1 architecture, pairing/recovery runbook, deployment guide, and 50-Client matrix
- **WHEN** the kiosk read-back reports `device_disabled`
- **THEN** the handoff names the management route that re-enables the Device, the thin-kiosk verification command, and the expected paired identity, Time Signal, and heartbeat results
