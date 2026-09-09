## MODIFIED Requirements

### Requirement: Source mutations preserve identity ownership and concurrent work
<!-- requirement-id: U2-R5 -->

Source mutation SHALL validate uniqueness and ownership on the server, protect other scopes, and detect stale versions. A destructive change SHALL disclose dependent drafts, live pages and derived metrics. Unknown impact SHALL not be treated as no impact.

A destructive change SHALL be blocked only by a dependency an operator can resolve: a draft page binding, a published live page's widget binding, or a derived metric input. A playback story or readiness expectation that the display code registers for a destination SHALL be disclosed as a structural expectation and SHALL NOT block the change, because no operator action can clear it. The source-impact read SHALL report resolvable dependencies and structural expectations as separate sets, and SHALL report an empty set rather than omitting either one. This distinction SHALL apply identically to guided apply and direct source management.

#### Scenario: Concurrent save
<!-- scenario-id: U2-R5-S01 -->

- **GIVEN** two operators edit the same source revision
- **WHEN** the second saves after the first
- **THEN** a conflict response preserves the second draft and offers comparison/reload rather than blind overwrite

#### Scenario: Delete referenced source
<!-- scenario-id: U2-R5-S02 -->

- **GIVEN** a source is used by a published card and a draft
- **WHEN** deletion is requested
- **THEN** both dependencies are shown and unsafe deletion is blocked until explicitly resolved

#### Scenario: A registered expectation alone does not block a destructive change

- **GIVEN** a destination carries a registered playback or readiness expectation and no draft binding, published live page widget binding or derived metric input
- **WHEN** an authorized operator disables that source or moves it to another destination
- **THEN** the change is applied, the source and its mapping reach the same enabled state, and the registered expectation is still reported as a structural expectation rather than as a blocking dependency

##### Example: disabling a source whose destination only has registered expectations

- **GIVEN** the KN source on channel `kn-main` sends to `consumptionEnergy`, the display code registers that destination as a playback story and readiness expectation, and no draft, live page widget or derived metric input references it
- **WHEN** an authorized operator disables that source through guided apply or through direct source management
- **THEN** both entry points succeed, the source and its mapping are both disabled, and the source-impact read reports that mutation is allowed while still listing the registered expectations

#### Scenario: A resolvable dependency still blocks a destructive change

- **GIVEN** a destination is referenced by a draft binding, by a published live page's widget binding, or by a derived metric input
- **WHEN** an authorized operator disables that source or moves it to another destination
- **THEN** the change is rejected with the existing in-use conflict, the source, mapping, audit records and receipts are unchanged, and no subscription reconciliation is invoked

##### Example: which dependency kinds decide a destructive change

| Dependency on the destination | Destructive change |
|---|---|
| Draft page binding | rejected with `E1_SOURCE_IN_USE` |
| Published live page widget binding | rejected with `E1_SOURCE_IN_USE` |
| Derived metric input | rejected with `E1_SOURCE_IN_USE` |
| Registered playback story or readiness expectation only | applied, expectation still disclosed |
| Impact lookup failed | rejected with `E1_SOURCE_IMPACT_UNKNOWN` |

#### Scenario: A failed impact lookup is still not an empty dependency set

- **WHEN** the source-impact lookup cannot be established for an otherwise valid destructive change
- **THEN** the change is rejected as unknown impact, both the resolvable dependency set and the structural expectation set are reported as empty, and no source, mapping, audit, receipt or runtime mutation occurs
