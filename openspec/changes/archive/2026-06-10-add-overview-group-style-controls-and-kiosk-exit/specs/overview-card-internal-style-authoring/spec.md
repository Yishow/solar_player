## ADDED Requirements

### Requirement: Author family-scoped appearance controls for Overview card groups

The system SHALL expose, in the Overview editor, one family-scoped appearance region for KPI cards and one family-scoped appearance region for bottom widgets. Each region SHALL let the operator edit `surfaceOpacity`, `surfaceBlur`, and `shadowStrength`, and each edit SHALL synchronize the chosen value to every member style record in that family within the current draft session.

#### Scenario: Operator edits KPI card family appearance

- **WHEN** the operator changes a KPI family appearance field in `/display-pages/editor?page=overview`
- **THEN** the draft session updates the same appearance field for `power`, `today`, `total`, `co2Today`, and `co2Total`
- **AND** the existing per-card fields remain available for later fine tuning

#### Scenario: Operator edits bottom widget family appearance

- **WHEN** the operator changes a bottom widget family appearance field in `/display-pages/editor?page=overview`
- **THEN** the draft session updates the same appearance field for `weather`, `phasePower`, `generationTrend`, and `alertNotifications`
- **AND** saving the draft persists those synchronized widget style values through the existing draft/live config flow
