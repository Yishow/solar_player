## ADDED Requirements

### Requirement: Document trusted single-operator broker operation

The Windows PC/server deployment guidance SHALL document the user-selected trusted LAN Mosquitto host/port as the minimum broker setup. Dedicated MQTT identities, ACLs, TLS, credential rotation, WinRM broker administration, and production cutover witnesses SHALL be optional hardening rather than installation or acceptance prerequisites. The guidance SHALL state that another client with broker access can publish an allowlisted command and SHALL retain the collector-side safety boundaries.

#### Scenario: Operator uses the existing Windows broker
- **WHEN** the single operator configures `192.168.31.62` as the MQTT broker without credentials or TLS
- **THEN** deployment guidance allows the collector to start without broker administration steps
- **AND** it states the trusted-LAN trade-off
- **AND** it retains command sanitization, allowlist, atomic validation, TTL/idempotency, legacy-topic rejection, and `RESTART_UNSUPPORTED` verification

### Requirement: Deployment cutover clears legacy retained config state

The migration/runbook SHALL include a verifiable step to remove retained legacy `solar/{SITE}/config` messages before declaring application control hardening complete. The step SHALL operate only on the intended legacy config topics and SHALL NOT clear Solar summary/zone/state data indiscriminately.

#### Scenario: Operator clears legacy retained config
- **WHEN** the new command/state topics are active
- **THEN** the operator clears legacy retained config messages for configured sites
- **AND** verifies with a fresh subscription that no legacy retained config payload is returned
- **AND** verifies current Solar summary/state topics still provide their intended retained data
