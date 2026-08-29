## Purpose

Defines a bounded MQTT command/state contract for the Windows-only Go Solar collector so operational control remains diagnosable without retaining credentials or self-triggering config loops, including when the single operator accepts a broker without publisher authorization on a trusted LAN.

## ADDED Requirements

### Requirement: Collector commands and state use separate topic namespaces

The collector SHALL receive control commands only on `solar/{SITE}/cmd/get-config` and `solar/{SITE}/cmd/set` and SHALL publish sanitized configuration state on `solar/{SITE}/state/config`. Command and state topics MUST NOT be the same topic, and publishing state MUST NOT trigger the collector's own command handler.

#### Scenario: Management requests config state
- **WHEN** an authorized publisher sends a valid `get-config` command for CL
- **THEN** the CL collector publishes a sanitized CL configuration state on `solar/CL/state/config`
- **AND** that state publication does not cause another config request or response loop

#### Scenario: State is republished as retained data
- **WHEN** `state/config` is published retained
- **THEN** a newly connected authorized observer can receive the latest sanitized operational state
- **AND** the collector does not interpret the retained state as a command

### Requirement: Retained configuration state uses an explicit safe allowlist

`solar/{SITE}/state/config` SHALL contain only allowlisted non-secret operational fields. It MUST NOT contain login passwords, broker passwords, authorization tokens, cookies, secret keys, source credentials, or credential-equivalent values. It also SHALL NOT expose filesystem secret paths or full credential-bearing connection strings.

The initial safe state MAY include factory/site identity and non-sensitive runtime policy such as polling interval, night-pause state, heartbeat interval, anomaly threshold, and retain-policy flags.

#### Scenario: Collector source credentials are configured
- **WHEN** the collector stores a site login user/password and publishes `state/config`
- **THEN** the retained payload omits the login password and other credential values
- **AND** consumers cannot recover the credential from broker retained state

#### Scenario: Config state is requested repeatedly
- **WHEN** multiple authorized `get-config` requests are processed
- **THEN** every resulting `state/config` payload obeys the same safe-field allowlist
- **AND** no compatibility mode republishes the full internal config object

### Requirement: Remote set commands use a narrow field allowlist

`cmd/set` SHALL accept only explicitly registered non-secret operational fields and SHALL recognize `restart` only as an unsupported action. The initial remotely mutable field set SHALL be limited to operational tuning such as polling interval, night-pause/padding, anomaly threshold, heartbeat interval, and approved retain-policy flags. Remote commands MUST NOT modify site login credentials, broker credentials, broker host/port, executable/config filesystem paths, or arbitrary unknown configuration keys.

#### Scenario: Authorized operator changes polling interval
- **WHEN** a valid `cmd/set` requests an allowed polling interval value
- **THEN** the collector validates and persists the allowed change
- **AND** publishes updated sanitized state and a successful control result

#### Scenario: Command attempts to change a password
- **WHEN** `cmd/set` contains `login_pass`, broker password, or another non-allowlisted credential field
- **THEN** the collector rejects the command
- **AND** does not persist any part of an invalid atomic change request
- **AND** does not echo the rejected secret value in logs, state, or control result

#### Scenario: Command contains an unknown field
- **WHEN** `cmd/set` contains a key that is not in the remote mutation allowlist
- **THEN** the command is rejected with a stable validation code
- **AND** the unknown key is not added to persistent configuration

#### Scenario: Restart action is unsupported and atomic
- **WHEN** `cmd/set` contains `restart=true`, with or without otherwise allowlisted changes
- **THEN** the collector rejects the entire command with stable code `RESTART_UNSUPPORTED`
- **AND** none of the requested configuration changes are persisted
- **AND** the process remains running without exit, supervisor, or relaunch side effects

### Requirement: Every control command is correlated with a bounded non-retained result

A control command SHALL include a caller-generated `requestId` and bounded issuance/expiry metadata. After validation/processing, the collector SHALL publish one corresponding non-retained `solar/{SITE}/state/control-result` message containing at least site, request id, command kind, accepted/rejected status, stable result/error code, safe summary, occurrence time, and changed field names when accepted. The result MUST NOT include secret values, full rejected payloads, stack traces, or raw exceptions.

#### Scenario: Set command succeeds
- **WHEN** a valid `cmd/set` with request id `abc-123` changes two allowed fields
- **THEN** one non-retained control result references `abc-123`, identifies the command as accepted, and lists the changed field names
- **AND** no changed field values classified as sensitive are echoed

#### Scenario: Command validation fails
- **WHEN** a malformed command with request id `bad-1` is rejected
- **THEN** the control result references `bad-1` and exposes a stable bounded error code/summary
- **AND** the result is not retained for future subscribers

### Requirement: Control commands are idempotent and reject stale replay

The collector SHALL treat `(site, requestId)` as an idempotency key for a bounded retention window that survives MQTT reconnect and collector restart. Re-delivery of a previously completed request MUST NOT repeat its configuration mutation; the collector SHALL instead return the prior bounded result or an equivalent duplicate-result response. Commands outside the accepted issuance/expiry window MUST be rejected without side effects. An unsupported `restart=true` action SHALL remain a bounded rejection and SHALL NOT introduce a process-exit or supervisor side effect.

#### Scenario: QoS 1 redelivers an accepted set command
- **WHEN** the broker redelivers a previously accepted `cmd/set` with the same site and request id
- **THEN** the collector does not apply the configuration mutation a second time
- **AND** it returns the prior result or a stable duplicate-request result

#### Scenario: Restart action is rejected consistently
- **WHEN** a `cmd/set` with `restart=true` is received with a fresh request id
- **THEN** the collector returns `RESTART_UNSUPPORTED` and does not apply any accompanying changes
- **AND** the process remains running without exit or relaunch

#### Scenario: Expired command arrives
- **WHEN** an otherwise valid command arrives after its accepted expiry window
- **THEN** the collector rejects it with a stable stale-command result
- **AND** no configuration or lifecycle side effect occurs

### Requirement: Trusted single-operator LAN broker does not require role ACLs

The Windows collector SHALL support the user-selected trusted LAN Mosquitto broker without requiring dedicated management/collector identities, broker ACL provisioning, WinRM administration, or credential rotation. Broker authorization remains an optional operator hardening measure and SHALL NOT be a prerequisite for collector startup or application-level control validation.

#### Scenario: Single operator uses the existing LAN broker
- **WHEN** the configured broker is reachable on the operator's trusted private LAN without authentication
- **THEN** the collector connects and processes only valid new command envelopes
- **AND** sanitized state, allowlisted mutation, atomic validation, TTL/idempotency, legacy-topic rejection, and `RESTART_UNSUPPORTED` remain enforced

### Requirement: MQTT authentication and TLS are optional deployment inputs

The collector SHALL connect to the configured MQTT host and port when username, password, TLS CA, and TLS server-name inputs are absent. When the operator explicitly supplies credentials or TLS inputs, the collector SHALL use them and SHALL reject an explicitly invalid TLS configuration without printing secret values.

#### Scenario: Collector uses plaintext MQTT on the trusted LAN
- **WHEN** `mqtt_host` selects `192.168.31.62` and no MQTT credential or TLS environment input is supplied
- **THEN** startup attempts the configured plaintext MQTT connection
- **AND** missing authentication or TLS inputs are not reported as configuration errors

#### Scenario: Operator supplies optional verified TLS
- **WHEN** the operator supplies a valid CA file and TLS server name
- **THEN** the collector enables TLS certificate verification for that connection
- **AND** it does not disable certificate verification

### Requirement: Application command subscriptions remain bounded to configured factories

The collector SHALL subscribe to new command topics only for factories present in its active configuration, independent of whether the broker uses identities or ACLs. A collector configured for both CL and KN SHALL subscribe to both configured site prefixes and SHALL NOT add arbitrary factory command subscriptions.

#### Scenario: Collector is configured for CL and KN
- **WHEN** the MQTT connection succeeds
- **THEN** the collector subscribes to `solar/CL/cmd/#` and `solar/KN/cmd/#`
- **AND** it does not subscribe to an unconfigured factory command prefix

### Requirement: Legacy retained config secrets are actively removed during cutover

The control-contract migration SHALL explicitly clear retained messages from legacy `solar/{SITE}/config` topics after the new state topics are operational. Merely stopping new legacy publication is insufficient. The migration SHALL verify that a fresh subscriber cannot retrieve the old retained config payload.

#### Scenario: Broker contains a legacy retained config payload
- **WHEN** cutover begins and `solar/CL/config` has a retained legacy full-config message
- **THEN** the migration clears that retained message using the broker's supported retained-message deletion mechanism
- **AND** a fresh post-cutover subscriber receives no legacy retained secret from that topic

### Requirement: Legacy control topics do not remain an unprotected compatibility backdoor

After cutover, the active collector MUST NOT continue accepting privileged changes from legacy `solar/{SITE}/set` or treating legacy `solar/{SITE}/config` as a request channel. If a temporary compatibility detector is provided, it MAY diagnose legacy traffic but MUST NOT execute the legacy privileged command or republish secret-bearing state.

#### Scenario: Legacy set publisher remains on the network
- **WHEN** a client publishes to `solar/KN/set` after cutover
- **THEN** the active collector does not apply the requested configuration mutation
- **AND** management diagnostics or logs MAY report deprecated traffic without echoing sensitive payload content

### Requirement: Existing Solar data and health topics keep their data semantics

This security migration SHALL NOT change the established payload semantics of `solar/{SITE}/summary`, whole zone/data topics, `status`, `heartbeat`, or `alert` merely as a side effect of control hardening.

#### Scenario: Generation data publishes after control cutover
- **WHEN** the collector publishes the same valid factory summary input before and after control-topic migration
- **THEN** the `solar/{SITE}/summary` data fields/units/site identity remain compatible with the Solar Source Adapter contract
- **AND** only the control/config topic family changes according to this capability
