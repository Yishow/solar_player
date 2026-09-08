## MODIFIED Requirements

### Requirement: Ownership scope and physical-identity conflicts are blocking errors
<!-- requirement-id: M2-R11 -->

The server SHALL validate concrete site, reserved managed identities, existing destination identities and physical source claims on every preview and apply. A mapping SHALL not merge different meters into one destination because topic or labels match. Legitimate distinct measurements from one physical device MAY coexist, but duplicate cumulative registers SHALL not be counted as separate physical meters in E6. The UI SHALL provide row-level correction and preserve all unaffected selections.

Guided MQTT writes SHALL use the same authoritative ownership rules as other source-management writes. Solar-managed destinations, registered derived-metric destinations whose identities remain reserved even while disabled, and server-owned period-energy destinations SHALL NOT be acquired by a generic guided mapping. Ownership conflicts SHALL return a stable conflict code and HTTP 409 at both preview and apply. Apply SHALL evaluate current ownership again even when a previously issued preview token is otherwise valid. Rejection SHALL leave source definitions, mappings, source-change audit records, apply receipts and production subscriptions unchanged; a rejected preview SHALL NOT issue a usable token.

#### Scenario: Wrong site candidate
<!-- scenario-id: M2-R11-S01 -->

- **GIVEN** a CL-owned source is selected in KN setup
- **WHEN** the batch is reviewed
- **THEN** that row is blocked with a site correction or authorized review action instead of silently relabeling it

#### Scenario: Existing managed metric
<!-- scenario-id: M2-R11-S02 -->

- **GIVEN** a candidate proposes a destination managed by Solar or derived-metric ownership
- **WHEN** apply is requested
- **THEN** the conflict is blocked and offers the existing compatible source rather than overwriting ownership

#### Scenario: N1 Solar destination is rejected before a preview token exists

- **WHEN** an authorized operator previews an enabled generic MQTT source for `cl:factoryGeneration.totalKw`
- **THEN** the response is an ownership conflict, no usable preview token is issued, and the Solar destination and existing mappings remain unchanged

#### Scenario: N1 destination ownership changes after preview

- **GIVEN** an unowned custom destination had a valid guided preview and is subsequently claimed by an enabled derived metric
- **WHEN** the original mapping is applied
- **THEN** the operation is rejected with an ownership conflict and does not create a source, mapping, source-change audit record, apply receipt or runtime subscription

#### Scenario: N1 period metrics cannot be acquired by MQTT

- **WHEN** an authorized operator previews or applies a generic mapping to a server-owned `consumption.period.dayKwh`, `consumption.period.monthKwh` or `consumption.period.yearKwh` destination
- **THEN** the operation is blocked without changing the owned period metric or its calculation

#### Scenario: N1 disabled derived destinations remain reserved

- **GIVEN** a registered derived metric is disabled but retains its destination identity
- **WHEN** an authorized operator previews or applies a generic mapping for that identity
- **THEN** the ownership conflict is rejected, including when the incoming generic mapping is itself disabled, without releasing or overwriting the registered identity

#### Scenario: N1 unowned custom destinations remain usable

- **WHEN** a reviewed mapping targets an unowned custom metric in its authorized site and satisfies the existing physical-identity rules
- **THEN** it can be previewed and applied without changing any other site's sources or introducing a site-total or department assignment

## ADDED Requirements

### Requirement: Guided source and mapping enabled states are saved consistently

A guided mapping operation SHALL atomically persist the reviewed source and corresponding mapping with matching enabled states, including creation, disable and re-enable operations. Non-identity enabled-state changes SHALL retain the existing source revision and selector unless the reviewed draft explicitly changes them under the existing revision rules. A disabled result SHALL NOT be presented as an active measurement solely because another source subscribes to the same topic. Subscription reconciliation SHALL preserve other owners of shared topics. Retrying the same operation SHALL NOT add source revisions or duplicate apply receipts.

#### Scenario: N2 re-enable an existing reviewed source

- **GIVEN** an existing source and its mapping are both disabled
- **WHEN** a reviewed guided apply re-enables the source without changing its identity, topic or selector
- **THEN** both source and mapping are enabled in the same committed result, the revision and selector are preserved, and a subsequent eligible production packet can reach that source after successful runtime activation

#### Scenario: N2 create a disabled source

- **WHEN** a reviewed guided apply creates a source whose enabled state is false
- **THEN** its mapping is also disabled, it does not initiate activation on its own behalf, and no accepted reading is claimed for the new source

#### Scenario: N2 disable one owner of a shared topic

- **GIVEN** two mappings use the same production topic
- **WHEN** one source is disabled through guided apply
- **THEN** that source and its mapping are disabled together while the other source remains operational and its subscription is preserved

#### Scenario: N2 failure rolls back both sides

- **WHEN** a mapping write fails during an enabled-state change
- **THEN** neither the source nor mapping changes state, no successful apply receipt or source-change audit record is left behind, and no runtime activation is attempted

#### Scenario: N2 retry reuses the committed configuration

- **WHEN** the same re-enable apply is retried after a lost response or broker refusal
- **THEN** the committed source and enabled mapping remain consistent, only one source mutation and receipt exist, and retryable runtime activation retains its existing semantics
