## ADDED Requirements

### Requirement: Production capture exposes selectable bounded samples

A capture candidate's sample references SHALL resolve to bounded, redacted payload evidence usable by the normal mapping task, with connection, scope, exact topic, schema revision and immutable transport evidence. Candidate listing alone SHALL NOT be presented as a complete field-selection facility. A passive tap SHALL NOT claim coverage of topics to which production is not subscribed. Approved active discovery SHALL use an isolated short-lived subscription and expose its actual grant, refusal and expiry states.

#### Scenario: R3 unmapped approved topic is discoverable
- **WHEN** a publisher sends on an approved exact topic outside existing production subscriptions during an authorized active capture
- **THEN** the candidate and its selectable sample become available through the capture flow without creating a production mapping or changing production subscription ownership

#### Scenario: R3 sample evidence is retrievable and expires honestly
- **WHEN** a candidate supplies a sample reference and the mapping task requests it before and after expiry
- **THEN** the valid request returns bounded redacted evidence and the expired request returns an explicit refresh-required state, never fabricated payload data

#### Scenario: R3 capture shutdown preserves production
- **WHEN** a capture is stopped, expires, loses authorization or is disabled by the feature gate
- **THEN** its temporary resources are released while existing production subscriptions and accepted readings remain unchanged

#### Scenario: R3 access and payload limits remain enforced
- **WHEN** a sample request lacks authorized management/site access or exceeds configured payload and session budgets
- **THEN** the operation is denied or visibly limited without exposing unauthorized topics or blocking production ingestion
