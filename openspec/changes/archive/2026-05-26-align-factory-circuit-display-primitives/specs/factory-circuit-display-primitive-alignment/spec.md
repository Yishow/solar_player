## ADDED Requirements

### Requirement: Align Factory KPI cards with the shared metric-card family

The implementation SHALL render `FactoryCircuit` KPI cards through the shared display metric-card family or an equivalent wrapper so their frame, header, icon, value row, unit baseline, and footer rhythm align with the rest of the playback display pages.

#### Scenario: Factory KPI cards adopt shared metric rhythm

- **WHEN** `/factory-circuit` renders KPI cards
- **THEN** each KPI card uses the shared metric-card frame/header/value/footer rhythm
- **AND** each card keeps its current FHD `left`, `top`, `width`, and `height`
- **AND** each card keeps its current data binding and semantic label
- **AND** compact Factory-specific value sizing is handled through CSS variables or slots rather than page-local absolute positioning

### Requirement: Share a display node vocabulary for circuit nodes

The implementation SHALL align Factory circuit nodes to a shared display node vocabulary for surface, border, shadow, icon, label, subtitle, value, and optional status treatment while preserving the circuit topology.

#### Scenario: Circuit node styling aligns without topology drift

- **WHEN** Factory circuit nodes render solar source, inverter, board, or load-related nodes
- **THEN** their visual surface and icon/label rhythm follow the shared display node vocabulary
- **AND** their current position, size, topology, and semantic role remain unchanged
- **AND** missing icon assets degrade to readable text within the same node geometry

##### Example: Inverter node adopts shared node surface without moving

- **GIVEN** the inverter node already renders at its current `left`, `top`, `width`, and `height`
- **WHEN** the node is migrated to the shared display node vocabulary
- **THEN** its surface, icon, zh/en labels, and optional value follow shared display node roles
- **AND** its geometry and role in the circuit topology stay unchanged
- **AND** if the icon source is missing, the same node frame still renders readable text content

### Requirement: Refine Factory routing treatment without changing status semantics

The implementation SHALL let Factory routing lines use shared display-family stroke and accent tokens while preserving the current routing topology, slot binding, and alert/status semantics.

#### Scenario: Routing polish preserves electrical meaning

- **WHEN** routing lines, connector segments, dashed paths, or endpoint markers render
- **THEN** they use tokenized primary, neutral, and accent/warning display colors
- **AND** they remain visually distinguishable for normal, warning, danger, and neutral states
- **AND** the line topology and status mapping do not change

##### Example: Warning connector keeps warning meaning after tokenization

- **GIVEN** a warning-state connector segment is currently mapped to an accent/warning treatment
- **WHEN** routing strokes are moved onto shared display-family tokens
- **THEN** the connector still reads as warning from display distance
- **AND** its start/end points and segment path stay unchanged
- **AND** neutral and danger routes remain visually distinguishable from the warning route

### Requirement: Align load rows through surface tokens without turning them into KPI cards

The implementation SHALL keep Factory load rows as compact status rows while aligning their surface, icon, text, and status colors with the shared display family.

#### Scenario: Load rows remain compact and status-aware

- **WHEN** Factory load rows render load labels, status labels, and runtime values
- **THEN** they keep their current compact row structure and information density
- **AND** their surface, border, icon, and status colors use display-family tokens
- **AND** they are not forced into the metric-card primitive

##### Example: Compact load row keeps alert semantics outside the KPI primitive

- **GIVEN** a load row already renders zh label, en subtitle, status tone, and runtime percentage in one compact row
- **WHEN** the row adopts shared display-family surface and status tokens
- **THEN** the row keeps the same compact density and label/value ordering
- **AND** warning and danger tones still map to their existing alert semantics
- **AND** the row does not become a metric-card frame
