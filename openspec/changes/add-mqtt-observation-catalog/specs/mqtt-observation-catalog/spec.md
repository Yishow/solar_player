## ADDED Requirements

### Requirement: Observations exist independently of metric mappings
<!-- requirement-id: M1-R1 -->

The server SHALL maintain a bounded MQTT observation catalog independent of topic_mappings and accepted meter readings. Authorized operators SHALL see configured mappings, observed-but-unmapped candidates, and configured-but-not-observed items as distinct states. Passive observation SHALL not require a successful extraction or creation of a tag first. The catalog SHALL distinguish a configured subscription from a subscription acknowledged by the broker.

#### Scenario: Unmapped message is visible
<!-- scenario-id: M1-R1-S01 -->

- **GIVEN** an allowed exact topic has no generic mapping
- **WHEN** a discovery subscriber receives its payload
- **THEN** an unmapped candidate appears without inserting a metric, a meter baseline, or a page binding

#### Scenario: Configured source has no observation
<!-- scenario-id: M1-R1-S02 -->

- **GIVEN** a mapping exists but no matching message has been observed
- **WHEN** the operator opens the catalog
- **THEN** the mapping appears as waiting for data, not as a discovered live meter

### Requirement: Discovery uses approved named reception scopes
<!-- requirement-id: M1-R2 -->

The default UI SHALL inherit the concrete site and current broker reference and offer named approved reception scopes rather than requiring operators to type subscription filters. Scope ownership SHALL be approved metadata, not a conclusion from topic spelling. Where no scope is configured, a privileged inline setup SHALL allow selecting authorized namespace candidates or entering an explicit filter without losing the task. It SHALL NOT silently subscribe to #, expand permissions, relabel another site, or invent a site prefix.

#### Scenario: Configured KN reception group
<!-- scenario-id: M1-R2-S01 -->

- **GIVEN** KN has an approved named MQTT reception group
- **WHEN** the KN operator presses find meters
- **THEN** the server uses that group under the current authorization without asking for topic strings or broker credentials again

#### Scenario: Unknown namespace
<!-- scenario-id: M1-R2-S02 -->

- **GIVEN** no KN reception scope is approved
- **WHEN** discovery is requested
- **THEN** the UI explains the one-time missing scope and offers authorized inline configuration; it does not silently guess kn/# or subscribe to everything

### Requirement: Discovery is isolated from production ingestion
<!-- requirement-id: M1-R3 -->

Active discovery SHALL use a distinct short-lived MQTT client identity and normal non-shared subscriptions. It SHALL never publish, reuse the runtime client ID, consume a production shared-subscription slot, or alter runtime subscription ownership. A passive runtime tap MAY feed the catalog before parsing, but catalog pressure SHALL not block or replay production ingestion. Explicit stop, expiry, loss of authorization, shutdown, and abandoned-session expiry SHALL close discovery resources.

#### Scenario: Stop does not unsubscribe production
<!-- scenario-id: M1-R3-S01 -->

- **GIVEN** an existing production mapping and a discovery session observe the same topic
- **WHEN** the discovery session expires
- **THEN** production subscription and accepted readings continue unchanged and the discovery connection is closed

#### Scenario: Two simultaneous users
<!-- scenario-id: M1-R3-S02 -->

- **GIVEN** two authorized operators start discovery
- **WHEN** the sessions connect and one is canceled
- **THEN** unique client IDs prevent runtime disconnection and the remaining session is unaffected

### Requirement: Reception evidence is not a broker inventory promise
<!-- requirement-id: M1-R4 -->

The catalog SHALL state the broker reference, approved filters, capture interval, per-filter subscription outcome, last-seen time, and coverage limits. It SHALL describe what was observed in the authorized window, not all broker topics or everything any publishing client ever sent. No traffic SHALL mean no observation in this window, not proof of no device. Broker refusal, timeout, disconnected runtime, and granted-but-silent subscriptions SHALL have distinct recoverable states. A silent grant SHALL not be diagnosed as definitely healthy permission or definitely a stopped publisher.

#### Scenario: No new data after a grant
<!-- scenario-id: M1-R4-S01 -->

- **GIVEN** the broker grants the approved filter but sends no matching packet
- **WHEN** capture ends
- **THEN** the UI reports the observation window and no received data, offering retry or scope review without declaring zero installed meters

#### Scenario: One filter refused
<!-- scenario-id: M1-R4-S02 -->

- **GIVEN** one filter is granted and another is refused
- **WHEN** capture returns candidates
- **THEN** coverage is partial and the refusal is shown; the result is not reported as a complete scan

### Requirement: Message provenance and identity claims are evidence based
<!-- requirement-id: M1-R5 -->

Observed samples SHALL carry a connection reference, exact received topic, observedAt and receivedAt as separate fields, packet retain/dup/QoS metadata when available, capture origin, and schema revision. Publisher identity SHALL be unknown unless supplied by an approved authenticated source of metadata; a payload clientId or tag SHALL be labeled a claim, not authenticated publisher identity. The capture path SHALL preserve metadata currently lost by converting only topic and payload to the runtime handler.

#### Scenario: Publisher client ID unavailable
<!-- scenario-id: M1-R5-S01 -->

- **GIVEN** a normal MQTT message contains only a meter reading
- **WHEN** the UI shows source details
- **THEN** publisher client ID remains unknown; the subscriber runtime client ID is not shown as its publisher

#### Scenario: Publisher claims a device ID
<!-- scenario-id: M1-R5-S02 -->

- **GIVEN** a payload includes clientId and deviceId fields
- **WHEN** the candidate is displayed
- **THEN** the UI labels them payload-declared identifiers and preserves the exact topic and receive time as independent evidence

### Requirement: Retained and replayed samples do not become fresh measurement evidence
<!-- requirement-id: M1-R6 -->

Retained replay SHALL remain explicitly labeled, with freshness derived from credible source time when present. A replay without source time SHALL have unknown observation age even if received now. A retained last value SHALL not prove present traffic, historical coverage, all tags on a multiplexed topic, or a day/month/year baseline. Discovery samples SHALL never be backfilled into accepted energy history merely by selecting them.

#### Scenario: Old retained sample
<!-- scenario-id: M1-R6-S01 -->

- **GIVEN** a retained packet observed last month is delivered now
- **WHEN** the operator reviews it
- **THEN** it can help configure extraction but is not shown as a fresh reading or counted as current-period energy

#### Scenario: One retained tag on a multiplexed topic
<!-- scenario-id: M1-R6-S02 -->

- **GIVEN** one topic previously carried many tags but only the latest retained packet is available
- **WHEN** discovery receives that packet
- **THEN** the catalog shows only that observed tag and explicitly does not claim to know all historical tags

### Requirement: Candidate grouping respects tag identity and incomplete schemas
<!-- requirement-id: M1-R7 -->

The catalog SHALL distinguish an exact topic from candidate fields and tag-qualified samples within that topic. A bounded sampler SHALL retain evidence for more than only the last packet per topic so interleaved tags remain selectable. Suggested identity fields and schema shapes SHALL remain unconfirmed until reviewed by M2. Fields, tag identifiers, and observed schema variants SHALL be searchable; live list updates SHALL not reorder selected items or discard user selection.

#### Scenario: Interleaved tag observations
<!-- scenario-id: M1-R7-S01 -->

- **GIVEN** one exact topic reports MAIN then STAMP then MAIN
- **WHEN** the catalog updates
- **THEN** both candidate tags remain selectable and are not merged into a single changing meter

#### Scenario: Schema changes during selection
<!-- scenario-id: M1-R7-S02 -->

- **GIVEN** one selected topic reports a new payload shape
- **WHEN** the catalog refreshes
- **THEN** the selected candidate keeps its original revision and shows a changed-schema warning rather than silently repointing its value

### Requirement: Capture and payload inspection are bounded and authorized
<!-- requirement-id: M1-R8 -->

Every catalog, capture, sample-inspection and stream operation SHALL enforce management and site authorization server-side. The initial proposed limits SHALL be 180-second sessions, an explicit maximum 600-second extension, 256 KiB per payload, depth 16, 2000 candidate leaves per payload, 1000 topics, 5000 candidates, 10 samples per candidate and 10 MiB raw-sample memory per session, with finite instance-wide budgets. Oversize, unsupported, rejected and dropped counts SHALL be surfaced. Secrets SHALL be redacted, untrusted content escaped, and payloads/credentials excluded from URLs, normal logs and exports. Limits are proposal defaults, not measured site capacity.

#### Scenario: Oversized or hostile payload
<!-- scenario-id: M1-R8-S01 -->

- **GIVEN** a packet is oversized or contains a script-like field and a token
- **WHEN** it is inspected
- **THEN** bounded handling rejects or truncates with a visible reason, renders text safely, redacts the token and does not block production ingestion

#### Scenario: Unauthorized sample access
<!-- scenario-id: M1-R8-S02 -->

- **GIVEN** a CL-only user obtains the ID of a KN capture
- **WHEN** they request a sample or stream
- **THEN** the server denies access without returning KN topic names, payloads, or cached samples

### Requirement: Offline evidence is available without pretending to be live
<!-- requirement-id: M1-R9 -->

The same UI SHALL offer paste-sample and bounded structured-example import as recovery options, not mandatory prerequisites. Supported local examples SHALL be labeled imported or pasted and go through the same parser and permission checks. Configured source labels and approved recipes MAY persist, but raw sample bodies SHALL expire with the capture retention policy and shall not become permanent history. Opaque client exports and binary/proprietary formats SHALL not be claimed as supported without an implemented parser.

#### Scenario: A device is temporarily offline
<!-- scenario-id: M1-R9-S01 -->

- **GIVEN** no live candidate is available but an operator has a JSON example
- **WHEN** they paste it inside the current task
- **THEN** the preview is labeled offline example and can prepare a waiting-for-data mapping without claiming actual reception

#### Scenario: Return after expiry
<!-- scenario-id: M1-R9-S02 -->

- **GIVEN** an earlier catalog entry remains known but its raw samples expired
- **WHEN** the operator opens its field picker
- **THEN** the UI requests a new capture or an example in place and does not reuse an expired raw body

### Requirement: Discovery and mapping APIs share stable references and recoverable states
<!-- requirement-id: M1-R10 -->

Discovery SHALL expose stable opaque capture and candidate references with bounded pagination and revision-aware sample access. Candidate references SHALL bind broker, scope, exact topic and schema evidence. Expired or changed evidence SHALL produce explicit retry states without clearing the mapping draft. Capture endpoints SHALL not accept arbitrary hosts or credentials from untrusted sample data; they SHALL reference an existing authorized connection. Catalog output SHALL never be used directly as accepted meter history.

#### Scenario: Expired sample reference
<!-- scenario-id: M1-R10-S01 -->

- **GIVEN** a draft selects a capture that expires
- **WHEN** preview is requested
- **THEN** the draft is preserved and the UI offers refresh evidence; it does not substitute an unrelated latest payload

#### Scenario: Broker injection in sample
<!-- scenario-id: M1-R10-S02 -->

- **GIVEN** an example payload contains a host field pointing elsewhere
- **WHEN** the candidate is previewed
- **THEN** no network connection to that host occurs; connection identity stays the approved configured reference

### Requirement: Rollout and rollback preserve existing source ownership
<!-- requirement-id: M1-R11 -->

Catalog discovery SHALL be additive and feature-gated. Disabling it SHALL close capture resources and remove temporary subscriptions without deleting generic mappings, managed adapter subscriptions, retained broker messages or meter history. Existing Solar managed resources SHALL be shown as reusable managed sources rather than editable generic duplicates. Existing production behavior SHALL be measured during connect, reconnect, saturation, and rollback tests.

#### Scenario: Feature rollback
<!-- scenario-id: M1-R11-S01 -->

- **GIVEN** catalog discovery is disabled while a session is active
- **WHEN** rollback completes
- **THEN** the session ends and production sources, mappings and history remain available

#### Scenario: Managed Solar candidate
<!-- scenario-id: M1-R11-S02 -->

- **GIVEN** a discovered topic belongs to a registered managed adapter
- **WHEN** the operator selects it
- **THEN** the UI offers the managed source or diagnostics and does not create a conflicting generic energy mapping
