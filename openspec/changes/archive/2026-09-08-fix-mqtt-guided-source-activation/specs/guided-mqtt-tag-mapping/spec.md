## ADDED Requirements

### Requirement: Guided mapping completion includes observable runtime activation

The management mapping apply operation SHALL distinguish an atomically saved source/mapping from a broker-acknowledged runtime subscription and from an observed measurement. A newly saved exact topic SHALL be reconciled with production subscription ownership without requiring a server restart or manual reload. An activation failure SHALL preserve the committed configuration and offer retry without duplicating source revisions or changing unrelated subscriptions.

#### Scenario: R1 new topic activates without restart
- **WHEN** an authorized operator applies a reviewed mapping for a topic not covered by any current production subscription and the broker grants its subscription
- **THEN** production reception becomes active without restart, the response identifies saved and activated states, and a subsequent production packet reaches the selected source
- **AND** preview samples are not replayed into accepted history

#### Scenario: R1 retry after broker refusal
- **WHEN** the configuration commits but the broker refuses subscription, and the operator retries the same saved operation after recovery
- **THEN** the first result reports saved but not active, the retry attempts activation again, and only one source/mapping mutation and idempotency receipt exist

### Requirement: Reviewed power mappings retain selector semantics in production

Reviewed selector semantics SHALL apply to both power-gauge and energy sources. A source's measurement kind SHALL determine its output unit and destination, not whether its selector is honored. Power-gauge readings SHALL NOT be admitted as cumulative-energy readings or used as period baselines.

#### Scenario: R2 select one power tag from an array
- **WHEN** a power-gauge mapping selects tag P1 and field value from a packet containing P1=12.5 and P2=99
- **THEN** preview and production both resolve P1=12.5 with the reviewed power unit and scaling, rather than reading P2 or failing through a scalar-only parser
- **AND** accepted energy history remains unchanged

#### Scenario: R2 ambiguous or missing power tag
- **WHEN** a packet has no matching P1 record or multiple indistinguishable P1 records
- **THEN** the mapping reports a selector error, preserves its last valid value with honest freshness, and does not substitute another record or zero
