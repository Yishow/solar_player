## ADDED Requirements

### Requirement: The routed onboarding task supplies real mapping evidence

The normal Data Hub onboarding entry SHALL let an authorized operator obtain a bounded actual or explicitly offline sample, select a concrete source and exact topic, review measurement semantics, preview extraction, and apply without developer-supplied component inputs. The selected site, source, sample identity and draft SHALL survive step navigation. Empty, unauthorized, expired and disconnected observation states SHALL remain distinguishable and recoverable.

#### Scenario: R3 normal entry reaches mapping preview
- **WHEN** an operator enters the KN connect-data task with an approved reception scope and receives a synthetic broker packet within that scope
- **THEN** the routed task displays selectable fields, carries the selected source and topic into preview, and permits confirmed apply without a manual topic copy or injected child-component fixture

#### Scenario: R3 no observation is not an unrecoverable wizard
- **WHEN** an approved capture is silent or its sample expires while a draft exists
- **THEN** the task preserves the draft and offers capture retry or a bounded labeled offline example, without claiming the source is live

### Requirement: MQTT test confirmation binds the actual resolved publish target

A real test-publish confirmation SHALL show the actual authorized broker reference, exact resolved topic, site, metric identity, value, payload representation and retain setting that will be sent. Confirmation SHALL be tied to the current target configuration and payload. Target or payload changes SHALL invalidate confirmation before any publish. The onboarding task SHALL NOT invent a topic or use a fixed production test reading as a substitute for operator-reviewed input. Read-only parsing preview and cancellation SHALL publish nothing.

#### Scenario: R4 configured topic differs from a naming convention
- **WHEN** KN consumptionEnergy is configured on factory/kn/main rather than kn/kn-main and the operator requests a test
- **THEN** confirmation shows factory/kn/main and the exact reviewed payload; confirmed publishing sends only that payload to that resolved target with retain=false by default

#### Scenario: R4 mapping changes while confirmation is open
- **WHEN** the source topic or broker configuration changes after the operator opens confirmation
- **THEN** the server rejects the stale confirmation with zero broker publishes and the UI requires a fresh target review without discarding the entered value

#### Scenario: R4 preview and cancel have no broker side effects
- **WHEN** an operator parses an example or cancels a real-publish confirmation
- **THEN** no publish is attempted and no accepted reading, live value or baseline is created by that action
