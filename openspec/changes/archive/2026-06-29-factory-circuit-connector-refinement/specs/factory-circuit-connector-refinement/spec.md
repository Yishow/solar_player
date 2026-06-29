## ADDED Requirements

### Requirement: Unified Comb Output Connector
The `/factory-circuit` page SHALL render a single-trunk, multi-branch comb-structured connector between the switchboard (board) and the 6 load rows.
The connector SHALL start from the vertical center of the switchboard's right edge, extend horizontally to a middle vertical bus line, and then branch out into 6 horizontal lines, each connecting to the horizontal center of a corresponding load row.
The connector line style (color and width) SHALL align with the default visual style of other flow connectors.

#### Scenario: Rendering the comb connector
- **WHEN** the `/factory-circuit` page is rendered
- **THEN** the load-routing connector is drawn dynamically from the switchboard's right center (approx X=1258, Y=454) to the vertical bus (approx X=1290) and branches to all 6 load rows.
- **AND** the legacy `factory-routing-load-reference.png` static image is not visible.
- **AND** the imports and definitions of `factory-routing-load-reference.png` are preserved to satisfy test cases.
