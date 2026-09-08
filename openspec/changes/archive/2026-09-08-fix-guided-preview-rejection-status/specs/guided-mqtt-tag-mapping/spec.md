## MODIFIED Requirements

### Requirement: Ownership scope and physical-identity conflicts are blocking errors
<!-- requirement-id: M2-R11 -->

The server SHALL validate concrete site, reserved managed identities, existing destination identities and physical source claims on every preview and apply. A mapping SHALL not merge different meters into one destination because topic or labels match. Legitimate distinct measurements from one physical device MAY coexist, but duplicate cumulative registers SHALL not be counted as separate physical meters in E6. The UI SHALL provide row-level correction and preserve all unaffected selections.

Guided MQTT writes SHALL use the same authoritative ownership rules as other source-management writes. Solar-managed destinations, registered derived-metric destinations whose identities remain reserved even while disabled, and server-owned period-energy destinations SHALL NOT be acquired by a generic guided mapping. Ownership conflicts SHALL return a stable conflict code and HTTP 409 at both preview and apply. Apply SHALL evaluate current ownership again even when a previously issued preview token is otherwise valid. Rejection SHALL leave source definitions, mappings, source-change audit records, apply receipts and production subscriptions unchanged; a rejected preview SHALL NOT issue a usable token.

The 409 status SHALL identify a contest with the destination's actual owner and SHALL NOT be extended to other rejections. A preview rejected for the shape or internal consistency of its own draft SHALL retain the unprocessable-entity status it reports outside an ownership contest, so an operator is told to correct the draft rather than to choose a different destination. The set of ownership conflict codes SHALL have one authoritative definition that routes read rather than restate.

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

#### Scenario: A malformed draft is not reported as an ownership contest

- **GIVEN** a preview draft whose topic contains a wildcard character, so it cannot be reviewed at all
- **WHEN** an authorized operator previews it
- **THEN** the response is unprocessable-entity with `SOURCE_REVIEW_REQUIRED`, not the ownership-conflict status

#### Scenario: An internally inconsistent draft keeps its own status

- **GIVEN** a preview draft whose declared scaling is not a positive decimal
- **WHEN** an authorized operator previews it
- **THEN** the response is unprocessable-entity with `PREVIEW_DRAFT_MISMATCH`, and no preview token is issued

#### Scenario: An ownership contest still answers with the conflict status

- **WHEN** an authorized operator previews a generic source for a destination the Solar adapter or an enabled derived metric already owns
- **THEN** the response is the ownership conflict status with its stable code, and no usable preview token exists
