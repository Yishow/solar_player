## ADDED Requirements

### Requirement: Retired topic mappings are removed when a derived metric takes over their identity

A derived metric definition reserves its scoped metric identity: a topic mapping MUST NOT carry that identity, whether the mapping or the definition is enabled or disabled. Consequently, when a release moves a scoped identity from a topic mapping to a derived metric definition, the superseded topic mapping row SHALL be removed rather than left disabled.

A management surface that reads the topic mapping list and saves it back unchanged SHALL succeed. Leaving a superseded row in place makes that round-trip permanently unsavable, because the save rejects the reserved identity and the surface offers no way to remove the row.

Removal SHALL be limited to the identities a derived metric definition actually produces. A retired-looking row whose identity no definition produces is still savable and SHALL be kept, along with its operator-configured topic, scale, offset, decimal places and labels.

#### Scenario: Upgraded deployment saves the topic mapping list unchanged

- **WHEN** a deployment that previously stored topic mappings for `cl/selfConsumptionRatio` and `global/todayGeneration` is upgraded to a release where derived metric definitions produce those identities, and an operator saves the topic mapping list read from that deployment without editing it
- **THEN** the save succeeds
- **AND** no derived metric identity conflict is reported
- **AND** the superseded rows are absent from the stored topic mappings

#### Scenario: A disabled row whose identity is not reserved is kept

- **WHEN** the same deployment also carries a disabled `cl/totalPower` mapping, an identity no derived metric definition produces because the definitions are keyed `factoryCircuit.jungliTotalPower` and `factoryCircuit.guanyinTotalPower`
- **THEN** that mapping is still present after the upgrade
- **AND** its configured topic, multiplier, offset, decimal places and labels are unchanged
- **AND** an operator can re-enable and save it

#### Scenario: Explicitly saving a mapping onto a reserved identity is still rejected

- **WHEN** an operator saves a topic mapping whose scoped identity a derived metric definition produces
- **THEN** the save is rejected as a derived metric identity conflict
- **AND** the rejection applies whether the incoming mapping is enabled or disabled, and whether the derived metric definition is enabled or disabled
- **AND** no topic mappings are written

##### Example: outcomes for one scoped identity owned by a derived metric definition

| How the identity reaches the save | Outcome |
| --------------------------------- | ------- |
| absent, because the superseded row was removed | save succeeds |
| present and enabled | rejected as derived metric identity conflict |
| present and disabled | rejected as derived metric identity conflict |
