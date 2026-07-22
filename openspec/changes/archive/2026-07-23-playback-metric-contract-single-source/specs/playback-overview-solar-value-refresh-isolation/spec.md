## ADDED Requirements

### Requirement: Overview and Solar runtime subscriptions consume shared playback metric contract keys

Overview and Solar value subtrees SHALL obtain their live-metric subscription key sets from the shared playback metric contract runtime key resolver. Those pages SHALL NOT maintain a separate authoritative hard-coded metric key array as the source of truth for which live metrics the value subtree reads. Value-only refresh isolation behavior remains required: static layout, hero, ornament, connector, and card-shell output SHALL stay stable when only live values change.

#### Scenario: Overview runtime keys match shared contract

- **WHEN** Overview builds its live-metrics selector subscription set
- **THEN** the subscribed key set equals the shared contract runtime keys for `overview`
- **AND** Overview does not define a parallel authoritative local metric-key truth list

#### Scenario: Solar runtime keys match shared contract

- **WHEN** Solar builds its live-metrics selector subscription set
- **THEN** the subscribed key set equals the shared contract runtime keys for `solar`
- **AND** Solar does not define a parallel authoritative local metric-key truth list

#### Scenario: Shared-backed keys preserve isolation on value-only updates

- **WHEN** Overview or Solar receives a live metrics update that changes only values for keys in the shared runtime subscription set
- **THEN** only the value-bearing subtree that depends on those keys updates
- **AND** static layout, hero media, ornament, connector, and card-shell output remain equivalent to the pre-refresh render
