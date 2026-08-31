## ADDED Requirements

### Requirement: Draft preview defaults to a scope the definition evaluates

When the authoring surface previews a draft definition without the operator naming a scope, it SHALL send a scope that the draft definition actually evaluates: the global scope for a global output scope policy, and the first declared site for a site output scope policy. The default scope SHALL be derived from the same declared evaluation scopes the authoring surface already shows as applicable.

A draft that declares a single site MUST NOT be previewed under the other site.

#### Scenario: KN-only site definition previews under KN

- **WHEN** an operator previews a draft site-scoped definition whose declared sites are KN only
- **THEN** the preview is evaluated under KN
- **AND** the request is not rejected for naming a scope the definition does not evaluate

#### Scenario: Global definition previews under global

- **WHEN** an operator previews a draft definition whose output scope policy is global
- **THEN** the preview is evaluated under the global scope

##### Example: default preview scope per declared policy

| Output scope policy | Declared sites | Default preview scope |
| ------------------- | -------------- | --------------------- |
| global | not applicable | `global` |
| site | CL, KN | `cl` |
| site | KN | `kn` |
| site | none declared | `cl` |
