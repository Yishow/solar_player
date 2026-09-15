## ADDED Requirements

### Requirement: KN registry begins as an explicitly uncommissioned plan
<!-- requirement-id: KNP-R1 -->

The KN plan SHALL separate reserved logical tag names from confirmed physical devices and source items. Unconfirmed entries SHALL have null source item and meter identity, disabled activation and an explicit planned status. The site inventory SHALL record source technology/session, physical identity, electrical boundary, direction, unit, CT/PT scaling provenance, timestamp/quality evidence, polling rate and responsible reviewer. The existing CL candidate/default list SHALL NOT be copied as confirmed KN equipment.

#### Scenario: Reserved name
<!-- scenario-id: KNP-R1-S01 -->

- **GIVEN** SITE_LOAD_KWH is reserved but its source item is unknown
- **WHEN** the register is delivered
- **THEN** the entry stays disabled with null source item and meter identity, not a usable runtime config

#### Scenario: Site source differs
<!-- scenario-id: KNP-R1-S02 -->

- **GIVEN** KN does not provide the confirmed CL DDE interface
- **WHEN** integration is planned
- **THEN** acquisition selection remains a prerequisite and no invented OPC NodeId, Item or host is inserted

### Requirement: KN starts with verified measurement boundaries rather than guessed totals
<!-- requirement-id: KNP-R2 -->

KN onboarding SHALL prioritize a verified consumption cumulative channel where available and MAY separately track grid-import cumulative energy. Grid import SHALL NOT be labeled full site consumption merely because it is the first or largest counter. Instantaneous kW SHALL remain unavailable until an actual power gauge is verified. Solar generation, grid export, storage effects and overlapping main/feeder boundaries SHALL be explicitly reviewed before site-total or share-basis configuration. No generic arithmetic shortcut SHALL replace the existing E6 profile validator.

#### Scenario: Only grid purchase available
<!-- scenario-id: KNP-R2-S01 -->

- **GIVEN** only GRID_IMPORT_KWH has a verified item
- **WHEN** the first view is enabled
- **THEN** it is labeled grid purchase, while full site consumption and unavailable power remain explicitly unavailable

#### Scenario: No power gauge
<!-- scenario-id: KNP-R2-S02 -->

- **GIVEN** only a kWh counter exists
- **WHEN** a screen asks for kW
- **THEN** the value is unavailable, not the same number with another unit

#### Scenario: Departments not inventoried
<!-- scenario-id: KNP-R2-S03 -->

- **GIVEN** one site-total candidate is verified but feeder boundaries are not
- **WHEN** the onboarding milestone completes
- **THEN** department allocation remains unconfigured without cloning CL formulas

### Requirement: KN commissioning progresses through explicit evidence gates
<!-- requirement-id: KNP-R3 -->

The plan SHALL gate source inventory, read-only acquisition, versioned publication, isolated receiver verification, shadow parity, reviewed E1 activation, E6 configuration and display binding separately. The proposed observation window SHALL include at least two Asia/Taipei midnight boundaries and recorded outages/replay tests in isolation; it SHALL be described as an acceptance target rather than completed measurement. Source time or explicitly approved estimation limitations SHALL be recorded before accepted ingestion. Lacking day/month baselines SHALL remain unavailable, not synthesized from lifetime counters or capture samples.

#### Scenario: Read success only
<!-- scenario-id: KNP-R3-S01 -->

- **GIVEN** DDE succeeds and MQTT publishes
- **WHEN** a milestone is reported
- **THEN** acquisition and publishing can be marked verified only with evidence, while Player subscription, parsing and E1 admission remain separate gates

#### Scenario: First cumulative sample
<!-- scenario-id: KNP-R3-S02 -->

- **GIVEN** one newly approved reading is available
- **WHEN** a daily or monthly widget is viewed
- **THEN** insufficient baseline or coverage is shown rather than lifetime energy relabeled as a period total

#### Scenario: Not enough field evidence
<!-- scenario-id: KNP-R3-S03 -->

- **GIVEN** Windows/DDE or actual KN meter evidence is missing
- **WHEN** the planning review completes
- **THEN** the documents may be committed but KN deployment and live acceptance stay blocked

### Requirement: KN rollout has a bounded and reversible operational plan
<!-- requirement-id: KNP-R4 -->

KN rollout SHALL have an identified commissioning owner and configuration backups, one publisher topic owner, explicit stop/rollback criteria and no writes to upstream PLC/SCADA. Changes to live publishers, production broker tests or display bindings SHALL require implementation/deployment authorization beyond this planning commit. Failures SHALL disable affected new channels without substituting CL data or deleting accepted history. Roles and physical mappings SHALL be approved individually before enabling placeholder entries.

#### Scenario: KN test fails
<!-- scenario-id: KNP-R4-S01 -->

- **GIVEN** a KN channel fails quality or boundary checks
- **WHEN** rollout stops
- **THEN** the affected KN activation remains disabled, CL and Solar operation continue, and no fake fallback values are produced

#### Scenario: Reserved feeder template
<!-- scenario-id: KNP-R4-S02 -->

- **GIVEN** FEEDER_<ID>_KWH names a template
- **WHEN** an operator prepares a real feeder
- **THEN** the placeholder is replaced only by a reviewed unique logical ID and exact physical/source-item mapping before activation
