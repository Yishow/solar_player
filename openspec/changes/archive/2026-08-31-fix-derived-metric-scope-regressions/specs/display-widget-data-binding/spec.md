## ADDED Requirements

### Requirement: Authoring scope options come from the effective metric catalog

The scope options offered when authoring a widget data binding SHALL be derived from the same effective metric catalog the server validates the saved configuration against. When a derived metric definition narrows the scopes a metric supports, the authoring surface SHALL offer only the narrowed scopes.

An operator MUST NOT be able to select, from the authoring surface, a scope that the server rejects as incompatible on save.

#### Scenario: Site-policy derived metric does not offer global

- **WHEN** an operator opens the data inspector for a widget bound to `selfConsumptionRatio`, whose derived definition uses the site output scope policy
- **THEN** the scope options list the device-inherited scope and the sites the definition evaluates
- **AND** the global scope is not offered

#### Scenario: Factory circuit total power offers only its own site

- **WHEN** an operator opens the data inspector for a `totalPower` binding on the Jungli factory circuit page, whose derived definition declares only the CL site
- **THEN** the scope options list the device-inherited scope and CL
- **AND** KN and global are not offered

##### Example: offered scopes per metric and page

| Page | Metric | Derived definition scopes | Offered scope options |
| ---- | ------ | ------------------------- | --------------------- |
| Solar overview | `selfConsumptionRatio` | site: CL, KN | inherit-device, CL, KN |
| Jungli factory circuit | `totalPower` | site: CL | inherit-device, CL |
| Guanyin factory circuit | `totalPower` | site: KN | inherit-device, KN |

#### Scenario: Selected scope survives save

- **WHEN** an operator selects any scope offered by the authoring surface and saves the draft
- **THEN** the server accepts the binding
- **AND** no incompatible-scope validation error is returned
