## MODIFIED Requirements

### Requirement: Connections presents the central broker as infrastructure
<!-- requirement-id: DHC-R1 -->

The Connections area SHALL expose the configured central Mosquitto/MQTT connection state and safe editable broker settings already supported by the product. Broker password/credentials MUST remain masked according to existing security behavior. The UI SHALL NOT require one broker connection per CL/KN site when both sites use the same central broker. It SHALL distinguish effective shared Player receiver runtime settings from the editable candidate and state that a site filter does not limit the effects within that receiver. Saving SHALL NOT change the broker daemon, upstream solar_mqtt_go collector, opc_mqtt bridge, or their separate WebUI connection settings.

#### Scenario: Both sites use one central broker
<!-- scenario-id: DHC-R1-S01 -->

- **GIVEN** CL and KN use the configured central Mosquitto connection
- **WHEN** data arrive through that connection
- **THEN** Connections shows one broker and its health, with site separation represented on sources/metrics rather than duplicate brokers

#### Scenario: Shared edit under KN
<!-- scenario-id: DHC-R1-S02 -->

- **GIVEN** KN is the selected management scope
- **WHEN** the operator reviews a broker change
- **THEN** the review identifies the shared impact without implying KN-only configuration

#### Scenario: Masked password is retained
<!-- scenario-id: DHC-R1-S03 -->

- **GIVEN** the existing password is masked
- **WHEN** the operator changes only the host and chooses to retain credentials
- **THEN** the existing secret is preserved without revealing or persisting its plaintext in the client

## ADDED Requirements

### Requirement: Connection actions state their real side effects
<!-- requirement-id: DHC-R2 -->

The interface SHALL distinguish reading current runtime status, testing an editable connection candidate, and saving shared settings. Reading status SHALL not be called a candidate connection test. A candidate test SHALL not persist settings, publish MQTT or disrupt the production client. Successful persistence SHALL not be reported as proven runtime connection success.

#### Scenario: Preflight only reads status
<!-- scenario-id: DHC-R2-S01 -->

- **GIVEN** onboarding checks the current runtime with a read request
- **WHEN** the operation completes
- **THEN** its label and result describe a current-status check rather than a test of unsaved fields

#### Scenario: Candidate test leaves production intact
<!-- scenario-id: DHC-R2-S02 -->

- **GIVEN** runtime A is connected and draft B is entered
- **WHEN** B is tested
- **THEN** A settings and production session remain unchanged and no MQTT publication occurs

#### Scenario: Save before reconnect
<!-- scenario-id: DHC-R2-S03 -->

- **GIVEN** the server saves a new configuration before runtime reconnection completes
- **WHEN** the client receives the save response
- **THEN** it shows saved and awaiting runtime confirmation rather than connected to the new target

### Requirement: Connection test results are bound to the tested candidate
<!-- requirement-id: DHC-R3 -->

Every test result SHALL be associated with the request, candidate revision and observed time. Editing connection-affecting fields SHALL invalidate its applicability to the current draft. Late results SHALL not overwrite newer candidate state or imply that the current untested settings passed.

#### Scenario: Edit after passing test
<!-- scenario-id: DHC-R3-S01 -->

- **GIVEN** candidate B passed a test
- **WHEN** the host or credentials change to C
- **THEN** the prior result no longer applies and C is visibly untested

#### Scenario: Late result
<!-- scenario-id: DHC-R3-S02 -->

- **GIVEN** B is being tested while C is now the active draft
- **WHEN** B response returns
- **THEN** it cannot mark C as tested or clear C edits

#### Scenario: Unknown diagnostic layer
<!-- scenario-id: DHC-R3-S03 -->

- **GIVEN** the API reports only a generic connection failure
- **WHEN** the UI explains the failure
- **THEN** it uses that supported reason and does not invent DNS, TCP or TLS evidence

### Requirement: Connection diagnostics preserve task context and honest data mode
<!-- requirement-id: DHC-R4 -->

Connection shortcuts SHALL preserve the authorized site and supported return context using guarded in-app navigation. Production connection status, simulation mode and source reception evidence SHALL remain distinct. Missing or stale status SHALL be shown as unknown or stale, not fresh success.

#### Scenario: KN shortcut
<!-- scenario-id: DHC-R4-S01 -->

- **GIVEN** Connections was opened from a KN mapping task
- **WHEN** the operator opens received sources or returns to the task
- **THEN** KN and the supported task draft context are retained

#### Scenario: Mock is not production
<!-- scenario-id: DHC-R4-S02 -->

- **GIVEN** the effective data mode is mock
- **WHEN** the connection summary renders
- **THEN** it labels simulation and does not claim real meter reception

#### Scenario: Status retrieval fails
<!-- scenario-id: DHC-R4-S03 -->

- **GIVEN** a previously green status cannot be refreshed
- **WHEN** the query fails
- **THEN** the last known value is dated and marked stale/unknown rather than silently kept as fresh

### Requirement: Broker editing is receiver scoped and upstream health stays independent
<!-- requirement-id: DHC-R5 -->

The connection surface SHALL name Solar Player as the receiver configuration owner. It SHALL NOT imply that changing this connection migrates the broker service or the solar_mqtt_go and opc_mqtt publishers. Publisher broker targets, authentication, prefix and local startup remain publisher-owned. Optional read-only upstream health SHALL identify its evidence age, client and source; receiver health, publisher liveness, source acquisition and per-source reception SHALL remain distinct. Engineering report delivery SHALL use the reviewed calendar/deadline and completeness evidence defined by G, not a physical-meter stale timer; an unknown delivery schedule SHALL remain unknown.

#### Scenario: Receiver moves alone
<!-- scenario-id: DHC-R5-S01 -->

- **GIVEN** both publishers still send to broker A
- **WHEN** the operator saves receiver broker B
- **THEN** the review warns that publishers are not migrated and B connectivity is not evidence that Solar or power data arrived

#### Scenario: Unavailable DDE source
<!-- scenario-id: DHC-R5-S02 -->

- **GIVEN** the opc_mqtt MQTT session is connected but VIEW.exe or a DDE item is unavailable
- **WHEN** status is shown
- **THEN** the upstream acquisition failure is distinct from MQTT connectivity and no current meter value is fabricated

#### Scenario: Independent publisher configuration
<!-- scenario-id: DHC-R5-S03 -->

- **GIVEN** the operator reviews Player settings
- **WHEN** the save completes
- **THEN** solar_config.json, opc_config.json, their environment credentials and collector command topics are unchanged
