## ADDED Requirements

### Requirement: Maintain an editor-managed Overview background pool

The Overview display page SHALL support a pool of full-canvas background candidate images, maintained through the editor using the existing asset and media source mechanism, and SHALL NOT introduce a new data source.

#### Scenario: Background pool seeded and editable

- **WHEN** Overview resolves its seed configuration
- **THEN** the background pool contains the seeded candidate images, and an operator can add or remove candidates in the editor

#### Scenario: Editor changes persist to runtime

- **WHEN** an operator changes the Overview background pool in the editor, saves the draft, and publishes
- **THEN** the published Overview runtime resolves the same pool

### Requirement: Pick a random background on each rotation entry

The Overview display page SHALL select one background from the pool each time the page is entered through playback rotation, and SHALL keep widgets and hero copy layered above the background.

#### Scenario: Random selection on entry

- **WHEN** Overview is entered through rotation and the pool has multiple candidates
- **THEN** one candidate is selected as the full-canvas background and the KPI, weather, three-phase, and trend widgets render layered above it

##### Example: Deterministic selection

| Pool size | Injected random value | Selected index |
| --------- | --------------------- | -------------- |
| 4         | 0.0                   | 0              |
| 4         | 0.5                   | 2              |
| 1         | 0.99                  | 0              |

#### Scenario: Out-of-range random value is clamped

- **WHEN** the random function returns a value at or beyond 1
- **THEN** the selected index stays within the pool bounds rather than producing an undefined selection

### Requirement: Fall back to hero media when the pool is empty

The Overview display page SHALL fall back to the existing hero media when the background pool is empty or a selected source cannot be resolved, without breaking the layout.

#### Scenario: Empty pool fallback

- **WHEN** the background pool is empty
- **THEN** Overview renders the existing hero media and shows no blank background artifact

### Requirement: Preserve architecture and Overview-only scope

The change SHALL keep navigation, routing, server APIs, the SQLite schema, the MQTT architecture, and the rotation scheduling algorithm unchanged, and SHALL NOT apply the background pool to other playback pages.

#### Scenario: No architectural change

- **WHEN** the background pool feature is added
- **THEN** navigation, routing, server APIs, the database schema, and the rotation scheduler remain unchanged, and only Overview gains the background pool
