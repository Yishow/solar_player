## ADDED Requirements

### Requirement: Reception scope selection is explicit and coverage is visible
<!-- requirement-id: DHR-R2 -->

The reception workspace SHALL present named authorized scopes for the concrete site and SHALL never silently choose the first of multiple profiles or claim coverage beyond the selected and broker-acknowledged filters. Start and stop SHALL describe discovery-only side effects and bounded lifetime.

#### Scenario: Several approved groups
<!-- scenario-id: DHR-R2-S01 -->

- **GIVEN** KN has two authorized profiles
- **WHEN** the user begins discovery
- **THEN** both are distinguishable and the chosen profile and coverage are shown before capture begins

#### Scenario: Only one of several filters observed
<!-- scenario-id: DHR-R2-S02 -->

- **GIVEN** one approved filter is selected and another is not captured
- **WHEN** the catalog renders
- **THEN** the result is labeled with the actual selected coverage, not all KN meters

#### Scenario: No profile permission
<!-- scenario-id: DHR-R2-S03 -->

- **GIVEN** the user cannot configure a missing approved scope
- **WHEN** the empty scope state renders
- **THEN** the UI explains required authorization without offering an ineffective button or wider subscription

### Requirement: Reception outcomes remain evidence-specific
<!-- requirement-id: DHR-R3 -->

The workspace SHALL distinguish waiting, granted-but-silent, refused, partial, disconnected, expired, query-failed and observed states using only available evidence. Counts SHALL be unknown while loading or failed. Retained and offline samples SHALL retain provenance and SHALL not imply current production reception, measurement freshness or history completeness.

#### Scenario: Silent capture
<!-- scenario-id: DHR-R3-S01 -->

- **GIVEN** a filter is granted but no packets arrive during a known interval
- **WHEN** the interval ends
- **THEN** the UI reports no observation during that interval and offers recovery without asserting zero devices

#### Scenario: Only retained sample
<!-- scenario-id: DHR-R3-S02 -->

- **GIVEN** a retained sample arrives now without credible source time
- **WHEN** it is listed
- **THEN** the UI labels retained evidence and unknown measurement age rather than just-now fresh data

#### Scenario: Catalog query failed
<!-- scenario-id: DHR-R3-S03 -->

- **GIVEN** the server query fails
- **WHEN** the list renders
- **THEN** it shows an error and retry without replacing known observations with a false zero count

### Requirement: Candidates expose identity and bounded sample context
<!-- requirement-id: DHR-R4 -->

The candidate list SHALL distinguish exact topics, tag-qualified candidates, candidate fields and mapping relationship. It SHALL show the observed evidence needed to choose a source and permit safe sample inspection within existing bounds and authorization. Expired evidence SHALL be recoverable in place without erasing the mapping draft.

#### Scenario: Interleaved topic
<!-- scenario-id: DHR-R4-S01 -->

- **GIVEN** one topic reports MAIN then STAMP then MAIN
- **WHEN** the candidate list updates
- **THEN** both tag candidates remain separately selectable without changing the selected meter

#### Scenario: Expired selected evidence
<!-- scenario-id: DHR-R4-S02 -->

- **GIVEN** a selected raw sample has expired
- **WHEN** inspection or preview is attempted
- **THEN** the draft remains and the user can request new evidence or an explicitly offline example

#### Scenario: Untrusted sample
<!-- scenario-id: DHR-R4-S03 -->

- **GIVEN** a payload contains markup and a token
- **WHEN** sample inspection opens
- **THEN** markup is text, sensitive material is redacted, and no payload is added to URL or normal logs

### Requirement: Discovery scope and subscription evidence belong to their actual client
<!-- requirement-id: DHR-R6 -->

Reception profiles SHALL explicitly distinguish the approved standard Solar filters, site-scoped power raw filters and diagnostic filters. Existing factory/cl/ and factory/kn/ defaults SHALL NOT be presented as coverage of solar or opc topics. A profile and source registry change SHALL require authorized review before capture; the UI SHALL NOT widen to # or opc/#. Each subscription result SHALL identify its owning client and connection generation. Stopping discovery SHALL release only that discovery client; subscription-sent from a collector WebUI SHALL NOT stand for Player SUBACK evidence.

#### Scenario: Different namespaces
<!-- scenario-id: DHR-R6-S01 -->

- **GIVEN** the configured approved scope is factory/kn/ but the publisher uses opc/v1/kn/raw/
- **WHEN** the user inspects coverage
- **THEN** the UI reports the mismatch and authorized scope-setup action instead of claiming no KN meters exist

#### Scenario: Exact Solar scope
<!-- scenario-id: DHR-R6-S02 -->

- **GIVEN** Solar inspection is authorized for KN
- **WHEN** discovery begins
- **THEN** only approved KN summary, whole-zone and separately approved diagnostic filters are used, with no command subscription or namespace expansion

#### Scenario: Independent stop
<!-- scenario-id: DHR-R6-S03 -->

- **GIVEN** production owns Solar and power subscriptions while a capture runs
- **WHEN** the capture ends or is canceled
- **THEN** production desired and active subscriptions remain intact and the WebUI monitoring client is unaffected

#### Scenario: Acknowledgement precision
<!-- scenario-id: DHR-R6-S04 -->

- **GIVEN** one subscription is refused or only a send event is known
- **WHEN** status is rendered
- **THEN** the per-filter refusal or unknown acknowledgement is shown for that client generation, without borrowing another client success
