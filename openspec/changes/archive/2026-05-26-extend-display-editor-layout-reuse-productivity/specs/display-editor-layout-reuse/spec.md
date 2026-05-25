## MODIFIED Requirements

### Requirement: Reuse layout adjustments within an editor session

The system SHALL let operators reuse layout adjustments by resetting to seed values or copying and pasting geometry between compatible regions. Geometry reuse SHALL also support named partial subsets and batch paste across multiple compatible targets within the same draft session.

#### Scenario: Operator pastes geometry into another region

- **WHEN** an operator copies geometry from one compatible region and pastes it into another
- **THEN** the destination region adopts that geometry
- **AND** the change remains part of the editable draft session

##### Example: Operator copies one KPI card geometry to another

- **GIVEN** two `Overview` KPI regions are marked as geometry-compatible
- **WHEN** the operator copies the geometry from one KPI region and pastes it into the other
- **THEN** the destination KPI adopts the copied rectangle
- **AND** the updated geometry remains part of the current unsaved draft

#### Scenario: Operator pastes only a named geometry subset

- **WHEN** an operator chooses a named geometry subset such as `position`, `size`, or `full-frame`
- **THEN** the destination region applies only that subset of the copied geometry
- **AND** the remaining geometry values stay unchanged

##### Example: Operator pastes only position into a second badge

- **GIVEN** two compatible badge regions differ in both size and position
- **WHEN** the operator pastes the `position` subset from the first badge into the second
- **THEN** the second badge adopts the first badge's `left` and `top` values
- **AND** the second badge keeps its original `width` and `height`

#### Scenario: Operator batch-pastes geometry into multiple compatible targets

- **WHEN** an operator selects multiple compatible paste targets for the same copied geometry
- **THEN** each compatible target receives the requested geometry subset
- **AND** the entire batch remains part of the current draft history

##### Example: Operator batch-pastes full-frame geometry into three cards

- **GIVEN** three selected `Overview` stat cards share the same geometry compatibility key
- **WHEN** the operator batch-pastes a copied `full-frame` geometry into those three cards
- **THEN** all three cards adopt the copied rectangle
- **AND** the operator can undo that batch paste from the draft history

#### Scenario: Operator targets an incompatible region

- **WHEN** an operator tries to paste copied geometry into a region with an incompatible geometry contract
- **THEN** the editor rejects that target
- **AND** the editor leaves the current draft geometry unchanged for that target

##### Example: KPI geometry cannot paste into a hero media frame

- **GIVEN** a copied `Overview` KPI card geometry and a hero media region with a different compatibility key
- **WHEN** the operator attempts to paste that copied geometry into the hero media region
- **THEN** the editor rejects the paste for that target
- **AND** the hero media region keeps its existing geometry
