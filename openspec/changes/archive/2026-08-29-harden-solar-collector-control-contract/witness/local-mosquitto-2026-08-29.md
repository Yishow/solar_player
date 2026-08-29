# Local Mosquitto control-contract witness

Date: 2026-08-29

This is a local black-box fixture only. It is not production acceptance and
does not use the repository's `solar_mqtt_go/solar_config.json`, a production
broker, production retained state, or production identities.

## Fixture boundary

- Broker: Mosquitto 2.1.2 on `127.0.0.1:18885` only.
- Config, password database, ACL copy, and logs: `/private/tmp/solar-player-harden-control-witness.y4S6hS/`.
- The fixture used a temporary ACL copied into `/private/tmp`; that ACL was an
  optional hardening experiment and is not part of the trusted-LAN deployment.
- Temporary migration/auditor/site-scoped users were fixture-only and are not
  production credentials. Passwords are intentionally not recorded here.
- Broker persistence was disabled. The fixture broker was isolated to
  loopback and was not used for any field or production state.

## Results

Using `mosquitto_pub`/`mosquitto_sub` against the fixture ACL:

- Authorized management publish to `solar/CL/cmd/set` reached the collector
  command subscriber.
- Collector, ordinary observer, and anonymous control publishes were denied;
  the broker log recorded `Denied PUBLISH` for the authenticated attempts and
  unauthenticated connection denial for the anonymous attempt.
- Legacy `solar/CL/set` and `solar/CL/config` publishes were denied.
- A CL-only fixture subscriber did not receive a KN command publication,
  demonstrating the site-scoped negative path in the isolated fixture.
- Retained `solar/CL/state/config` was readable by the observer and contained
  only the safe fixture state. A fresh subscriber received no subsequent
  non-retained `state/control-result` message.
- A temporary retained legacy config marker was visible before the targeted
  tombstone, absent to a fresh subscriber after the tombstone, while retained
  `solar/CL/summary` remained readable.

The broker log was used for ACL denial evidence because `mosquitto_pub` can
return success after the broker rejects a QoS 0 publish. No fixture password or
credential value is stored in this artifact.

## Restart contract

`GOCACHE=/private/tmp/solar-player-go-cache go test ./internal/service
-run 'TestControlRestart|TestControlSetRejectsRestart' -count=1` passed.
The tests verify `RESTART_UNSUPPORTED`, atomic rejection, duplicate replay
handling, and zero restart side effects. This is local Go test evidence only;
it is not a production witness.

## Acceptance boundary

This fixture supports local evidence for optional ACL hardening, transport
loopback, retained scrub, non-retained result, legacy denial, and unsupported
restart behavior. Production identities, remote TLS, and ACL cutover are not
requirements of the accepted single-operator trusted-LAN deployment.

## Live localhost collector acceptance

A second pass used the already-running Mosquitto 2.1.2 listener at
`127.0.0.1:1883` and the current Go collector binary built from this checkout.
Before the pass, the broker reported zero connected clients, listened only on
IPv4/IPv6 loopback, and exposed retained `solar/CL/status` and
`solar/KN/status`; no legacy retained `/config`, summary, or zone payload was
present. The collector used a restricted temporary runtime directory and the
existing two configured factories (`KN`, `CL`). No runtime config, source
credential, MQTT password, database, or raw control payload was copied into
this witness or the repository.

The live black-box matrix passed for both configured sites where applicable:

- `cmd/get-config` returned correlated accepted results for KN and CL.
- An allowlisted `cmd/set` applied and published retained sanitized state plus
  a non-retained result.
- Credential/unknown-field input was rejected atomically without echoing the
  seeded secret marker.
- Expired and future-dated commands were rejected; malformed JSON produced no
  untrusted correlated result.
- A repeated request id returned `duplicate` without applying a second change.
- `restart=true` returned `RESTART_UNSUPPORTED`, did not apply its accompanying
  interval, and the collector dashboard listener remained alive.
- Fresh KN and CL `state/config` subscriptions received retained state whose
  key paths contained none of the forbidden credential/topology/path markers.
- A fresh `state/control-result` subscriber received nothing, proving results
  were not retained.
- Publishing to legacy `solar/KN/set` produced no result or mutation.
- Exact retained tombstones were issued only to `solar/CL/config` and
  `solar/KN/config`; fresh subscriptions received no legacy config afterward,
  while the pre-existing status and new sanitized state remained available.
- Temporary KN/CL summary and zone sentinels were used to prove the exact
  config tombstones did not remove neighboring retained topics. The sentinels
  were then tombstoned to restore the broker's pre-test data-topic state.

This pass completes the localhost/loopback transport, configured-site retained
migration, and application black-box portions of tasks 3.2, 4.2, and 5.1. The
isolated ACL fixture above remains additional evidence only.

The listener is a local macOS development broker started with `mosquitto -d`,
not the Windows target broker. It proves the application contract but does not
independently prove Windows process launch. Authentication and remote TLS are
optional and were neither required nor claimed.

## Windows target pre-cutover probe

The user identified `192.168.31.62` as the Windows target broker. A bounded
read-only/connectivity probe established the following pre-cutover state:

- TCP 1883 and 8883 accept connections; WinRM HTTP on 5985 responds as
  Microsoft HTTPAPI, while SSH is unavailable.
- MQTT 3.1.1 anonymous CONNECT receives a successful CONNACK on both 1883 and
  8883.
- A TLS ClientHello to 8883 is terminated without presenting a certificate,
  while a plaintext MQTT CONNECT on the same port succeeds. Port 8883 is
  therefore not currently proven as a TLS listener.
- Two anonymous clients subscribed and published a non-retained connectivity
  probe on `solar/__WITNESS__/cmd/set`; the broker forwarded the command to the
  anonymous subscriber. No CL/KN command or retained payload was used.

This probe matches the accepted `192.168.31.62:1883` trusted-LAN transport:
anonymous plaintext access is intentionally allowed and is not a cutover
blocker. The explicit tradeoff is that any LAN client able to reach the broker
can publish control topics; protection therefore rests on the collector's
configured-site subscriptions, command allowlist, atomic validation, TTL,
idempotency, legacy-topic rejection, sanitized state, and unsupported restart
contract. Port 8883 must still not be represented as TLS because the probe did
not observe a certificate, but 8883 is outside this deployment path. No remote
configuration, service restart, credential read, or retained message change
was attempted during the probe.
