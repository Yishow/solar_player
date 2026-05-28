## ADDED Requirements

### Requirement: Show row-level display impact and governance risk in circuit settings

The system SHALL show row-level display impact and governance risk in `Circuit Settings`.

#### Scenario: Operator reviews one circuit row

- **WHEN** the operator inspects one circuit row
- **THEN** the row SHALL identify its display slot impact, validation state, and dirty or save risk in a structured summary
- **AND** the operator SHALL NOT need to infer those outcomes only from scattered captions

#### Scenario: Page summary points to row-level readiness concerns

- **WHEN** readiness findings exist for one or more circuit bindings
- **THEN** the page summary SHALL remain consistent with the corresponding row-level display impact and validation state

### Requirement: Preserve bulk table editing while strengthening bounded presentation authoring

The system SHALL preserve bulk table editing while strengthening bounded presentation authoring for circuit display fields.

#### Scenario: Operator edits many rows in one session

- **WHEN** the operator edits multiple circuit rows in the same table session
- **THEN** the page SHALL keep inline bulk editing as the primary workflow
- **AND** it SHALL NOT require a separate per-row wizard to complete ordinary edits

#### Scenario: Operator edits icon or presentation fields

- **WHEN** the operator edits icon or related presentation fields
- **THEN** the page SHALL constrain or validate those choices with a bounded authoring contract
- **AND** it SHALL NOT treat arbitrary freeform values as equally valid display presentation choices

### Requirement: Keep threshold semantics explicit during governance edits

The system SHALL keep threshold semantics explicit during circuit governance edits.

#### Scenario: Operator adjusts threshold ranges

- **WHEN** the operator changes normal, attention, or warning thresholds for a circuit row
- **THEN** the page SHALL show the resulting threshold semantics in the same governance surface
- **AND** the operator SHALL be able to understand whether the row remains internally consistent and ready for display binding review
