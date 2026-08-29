## Context

See `proposal.md` for motivation. The legacy collector subscribes to `solar/{SITE}/config` and `solar/{SITE}/set`; its config handler publishes the full internal config back to the same retained `/config` topic. That behavior both risks a self-triggering request/response loop and retains source credentials on the broker. The existing remote set path can mutate global/factory config fields, including sensitive login fields, and does not have an application-level request/result/idempotency contract.

The user is separately porting the collector to Go. This OpenSpec change SHALL NOT perform that language port or modify the Python collector as a substitute. Apply is intentionally gated on the user's active Go collector implementation being present and parity-tested for the Solar data contract. The legacy Python files remain reference evidence for the behavior being retired.

## Goals / Non-Goals

**Goals:**

- Separate command and state channels so state publication cannot recursively trigger command handling.
- Ensure retained broker state contains no collector/site credentials.
- Restrict remote mutation to a small operational allowlist and return correlated safe results.
- Make QoS/reconnect command delivery idempotent and time-bounded against replay; represent the unsupported restart action with a stable bounded rejection.
- Keep broker connectivity simple for the user's single-operator trusted LAN, with authentication/TLS optional rather than mandatory.
- Explicitly scrub legacy retained config data during rollout.
- Preserve Solar generation/zone/status/heartbeat/alert data semantics.
- Apply the collector control contract to the Windows-only Go product; this change does not create Linux/macOS release or service-manager behavior.

**Non-Goals:**

- No Python→Go translation or collector data-path redesign.
- No secret-management UI/API for changing login/broker credentials over MQTT.
- No arbitrary remote configuration of broker host, executable paths, scraper credentials, or unknown settings.
- No broker identity provisioning, ACL rollout, TLS/PKI setup, credential rotation, WinRM administration, or production broker cutover gate.
- No change to Solar Player's generation ingest contract.
- No NSSM, AppExit, supervisor, or cross-platform distribution contract.

## Decisions

### Use command/state topic separation with a bounded result channel

Final control hierarchy:

```text
solar/{SITE}/cmd/get-config       command, QoS 1, non-retained
solar/{SITE}/cmd/set              command, QoS 1, non-retained
solar/{SITE}/state/config         sanitized state, QoS 1, retained
solar/{SITE}/state/control-result command result, QoS 1, non-retained
```

Existing `summary`, zone, status, heartbeat, and alert topics remain unchanged.

`get-config` and `set` payloads include:

```text
requestId   non-empty bounded identifier
issuedAt    ISO timestamp or epoch contract
ttlSeconds  bounded command lifetime
```

`set` additionally includes:

```text
changes     object containing only allowlisted keys
restart     optional boolean action
```

`restart=true` is deliberately unsupported after removal of the NSSM feature.
The handler returns stable code `RESTART_UNSUPPORTED`, applies none of the
requested changes, records the bounded rejection when the current ledger
permits it, and keeps the process running. It does not exit, invoke a
supervisor, or require restart-specific replay/idempotency behavior.

Site identity comes from the topic; if payload also carries site for diagnostics, it must match. The command handler never publishes to `cmd/*`, eliminating self-trigger loops.

Alternative: request and response on one topic with a marker field. Rejected because retained responses can retrigger subscribers and the direction remains ambiguous.

### Define explicit sanitized state rather than serializing internal Config

Build `state/config` from a dedicated safe DTO, not `{...internalConfig}` followed by field deletion. Initial safe fields should include only operational values required for diagnostics/management, for example:

```text
factoryId/site
polling interval
night pause + padding
heartbeat interval
anomaly threshold
retain policy flags
collector build/version when available
state revision/update time
```

Do not include login username/password, broker password, authorization values, cookie/session data, source base URL if it can disclose internal credential-bearing topology, executable/config filesystem paths, or other fields not explicitly reviewed.

Using a positive allowlist means adding a new internal config field does not automatically expose it over MQTT.

Alternative: clone full config and redact known secrets. Rejected because future secret fields can be missed and old retained payloads already demonstrate the risk.

### Restrict `cmd/set` to non-secret operational tuning

Create a command-setting registry separate from the collector's full internal config schema. Initial allowed keys map to validated operational settings such as:

```text
interval
night_pause
night_padding_min
anomaly_daytime_zero_minutes
heartbeat_interval
mqtt_retain_summary
mqtt_retain_zone
mqtt_retain_status
mqtt_retain_alert
mqtt_retain_heartbeat
```

Other fields are rejected, including:

```text
factory_id
base_url
login_user
login_pass
mqtt_host / mqtt_port / mqtt_prefix
mosquitto executable/config paths
unknown keys
```

`restart` is an explicit command action, not a generic config key. A `set` request is atomic: validate every requested change and the action before changing any persisted field. If one field is invalid/forbidden, apply none.

Alternative: reuse the existing full Config schema and blacklist credential fields. Rejected because remote management should be narrower than local configuration and a blacklist is easy to bypass as schema grows.

### Return safe structured control results

Result DTO conceptually:

```text
site
requestId
command: get-config | set
status: accepted | rejected | duplicate
code: stable machine code
summary: bounded safe human text
changedKeys: string[]
occurredAt
configRevision?
```

Never echo the full command payload, secret values, stack traces, internal hostnames/paths, or raw exceptions. Invalid JSON that prevents parsing a usable requestId can be logged safely, but no correlated MQTT result is required if a request id cannot be trusted/extracted.

The successful `get-config` result and retained `state/config` are separate: the result confirms request processing; `state/config` carries current safe state.

### Persist command idempotency keys across reconnect/restart

MQTT QoS 1 is at-least-once. Maintain a bounded persistent processed-command ledger using the active collector's local persistence/state facility, keyed by `(site, requestId)` and storing command kind, completion status/result code, completion time, and a safe result summary/hash sufficient to return a duplicate result.

Recommended retention is at least 24 hours and greater than the maximum command TTL; implementation may retain longer within bounded storage. Purge expired ledger rows/entries periodically. Do not persist secret command payloads.

Processing sequence:

1. parse/validate envelope and time window,
2. check processed ledger,
3. if duplicate, emit duplicate/prior result without side effect,
4. validate full requested mutation,
5. persist mutation and idempotency completion atomically where feasible,
6. publish sanitized state/result,
7. publish the bounded result after durable completion is recorded.

When `restart=true` is present, validation rejects the whole request with
`RESTART_UNSUPPORTED` before any requested setting is persisted. The rejection
may be recorded as an ordinary command result so a duplicate request can return
the same bounded result; there is no process exit, supervisor action, or
restart-specific replay behavior.

Alternative: rely on MQTT DUP flag or in-memory set. Rejected because DUP is not a durable application idempotency guarantee and in-memory state disappears across collector restart.

### Bound command age with issuedAt + ttlSeconds

Require `issuedAt` and a TTL capped by policy (initial maximum can be 300 seconds). Reject commands that are already expired or unreasonably future-dated beyond a small clock-skew tolerance. This limits replay of a captured authorized command even with a new broker delivery.

Clock synchronization is an operational prerequisite for remote command use; central server collector/control publisher normally share the same host/clock, minimizing skew.

### Treat broker authorization as optional for the single-operator trusted LAN

The user-selected Windows deployment uses `192.168.31.62` as a trusted LAN
Mosquitto broker and is operated by one person. The collector therefore accepts
the configured broker without requiring a dedicated username/password, ACL,
WinRM-managed broker change, or credential rotation workflow. If optional MQTT
credentials are supplied, the client may use them, but absence is not an error.

This supersedes the earlier production-identity/ACL rollout design. The
application-level boundary remains mandatory: only the new `cmd/*` envelopes
are executable, retained state is sanitized, `cmd/set` is allowlisted and
atomic, replay is bounded, and `restart=true` remains unsupported.

Alternative: retain mandatory per-role ACL provisioning. Rejected for this
deployment because it adds operator work without matching the user's
single-operator trusted-LAN threat model.

### Allow operator-selected plaintext LAN MQTT without mandatory TLS

The collector uses the configured MQTT host and port. Loopback, authenticated
MQTT, and verified TLS remain compatible optional configurations, but a remote
private-LAN broker is not rejected merely because no TLS CA or credential
environment variable is present. The collector must not invent credentials or
silently rewrite the operator's broker selection.

The accepted trade-off is that another client with access to the trusted LAN
broker can publish an allowlisted command. The collector-side validation and
secret-exclusion rules limit the effect but do not provide broker-level access
control.

### Do not keep executable legacy command compatibility

After atomic cutover, the active collector stops subscribing to legacy `/set` and `/config` command semantics. Optional diagnostic monitoring may detect traffic to those legacy topics, but must not execute it. This prevents a forgotten old publisher from bypassing the new ACL/envelope/allowlist.

If rollout requires a short compatibility window, broker ACL should first deny legacy privileged publishers except a tightly controlled migration identity; the collector still should not publish legacy full config.

### Scrub old retained messages as a mandatory migration step

Retained messages survive application upgrades. During cutover, explicitly delete retained `solar/CL/config` and `solar/KN/config` (and configured factory equivalents) by publishing the broker-supported empty retained tombstone or using an equivalent safe admin operation.

Verification uses a fresh clean subscription after deletion and confirms no retained payload is delivered. Do not run a broad wildcard retained purge; summary/zone/state retained data must remain.

### Gate apply on the user's Go collector landing

Before implementation begins for this change:

- the user's Go collector must be present in the repository/deployment target,
- its Solar data/status/heartbeat behavior must pass parity checks against the current external data contract,
- its package/service path must be known for targeted edits/tests.

If that prerequisite is not true, this change is planning-complete but implementation-blocked. Do not “solve” the blocker by modifying the legacy Python collector unless the user explicitly changes the scope.

This preserves a single active collector implementation and prevents two ports from diverging.

## Implementation Contract

- **Behavior:** `run`, tray startup, and `test-mqtt` connect to the configured
  `mqtt_host`/`mqtt_port` when username/password and TLS environment variables
  are absent. Optional credentials and verified TLS continue to work when the
  operator supplies them.
- **Interface:** `SOLAR_MQTT_USERNAME`, `SOLAR_MQTT_PASSWORD`,
  `SOLAR_MQTT_TLS_CA_FILE`, and `SOLAR_MQTT_TLS_SERVER_NAME` are optional
  deployment inputs. `solar_config.json` remains free of broker secrets.
- **Failure modes:** invalid host/port/prefix and an explicitly requested but
  unreadable/invalid TLS CA fail before connecting. Missing credentials or TLS
  alone do not fail startup. Errors never print supplied passwords.
- **Acceptance:** focused MQTT option/start-script tests prove anonymous
  trusted-LAN and localhost startup, optional credential/TLS compatibility,
  and unchanged sanitized control behavior. The runbook has no mandatory ACL,
  TLS, credential rotation, WinRM, or production cutover gate.
- **Scope:** retain command/state separation, safe state, allowlist, atomic
  validation, TTL/idempotency, retained scrub, legacy-topic rejection, and
  `RESTART_UNSUPPORTED`. Do not add a secret-management system or modify the
  legacy Python collector.

## Risks / Trade-offs

- [Risk] Another trusted-LAN client publishes a valid allowlisted command → accepted by the user for this single-operator deployment; keep the application allowlist, TTL, idempotency, and bounded result contract.
- [Risk] Legacy retained secret survives binary upgrade → retained-topic scrub plus fresh-subscription verification is a mandatory completion gate.
- [Risk] A caller expects restart to happen → stable `RESTART_UNSUPPORTED` result, atomic rejection, and no process exit or supervisor dependency.
- [Risk] Clock skew rejects legitimate command → central control runs on one host where possible and command TTL validation includes bounded skew tolerance.
- [Risk] Safe config DTO accidentally grows secret fields → positive allowlist with tests that seed credentials/internal fields and assert absence.
- [Risk] Plaintext LAN MQTT has no broker-level confidentiality or publisher authorization → document the trusted-LAN assumption without pretending application validation replaces network security.
- [Risk] User Go port and this change edit same files concurrently → do not apply until Go port is landed and stable; then target only the active implementation.
- [Trade-off] Remote configuration becomes less flexible → accepted because credentials/topology are high-impact and should use local/deployment secret management rather than broadcast MQTT commands.

## Migration Plan

1. Wait for the user's Go collector to land and demonstrate parity for Solar summary/zone/status/heartbeat/alert data behavior. Record the active collector package/service path; do not edit Python as fallback.
2. Add black-box/unit contract tests for new command/state envelopes, safe DTO, allowlist validation, command results, idempotency/replay expiry, and unchanged Solar data topics.
3. Add collector-side command/state implementation and persistent request-id ledger in the active Go collector, initially with new topics available in a non-production/staging broker policy.
4. Configure the collector with the operator-selected trusted-LAN broker host and port; do not require broker identity, ACL, TLS, or WinRM changes.
5. Update any Solar Player management/control diagnostics that intentionally publish/read collector control state without adding a dedicated management credential requirement.
6. Deploy the collector after proving it no longer executes legacy `/set`/`/config` semantics even when the broker remains broadly reachable.
7. Clear retained legacy `/config` payloads for each configured site and verify from a fresh subscriber that they are gone while summary/zone/new `state/config` retained data remains.
8. Exercise valid set/get-config, forbidden credential mutation, unknown field, expired request, duplicate QoS delivery, `restart=true` atomic `RESTART_UNSUPPORTED` rejection, and credential redaction acceptance tests.
9. Update PC deployment/runbook with the trusted-LAN assumption, optional credential/TLS notes, legacy retained scrub, rollback, and troubleshooting; remove mandatory ACL/cutover procedures.
10. Run collector contract tests, relevant Solar Player diagnostics tests, deployment/runbook tests, `git diff --check`, and `pnpm verify` where affected.

Rollback must not restore secret-bearing legacy retained config. Restore only the previous Go build that retains sanitized state and rejects legacy privileged topics; do not restore the legacy Python collector or full retained `/config` payloads. Broker ACL/TLS state is outside this simplified product rollback contract.
