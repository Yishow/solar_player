## ADDED Requirements

### Requirement: Require witness-batch evidence for FHD-affecting frontend changes

The workflow SHALL require an evidence bundle whenever an AI-authored change affects playback visuals, shared display chrome, integrated editor workspaces, or management pages that participate in the FHD witness set. The evidence bundle SHALL identify the witness batch, affected surface family, protected visual attributes, exceptions, and verification pack.

#### Scenario: AI-authored playback visual change prepares an evidence bundle

- **WHEN** an AI-authored change modifies playback visuals or shared display chrome
- **THEN** the change includes an evidence bundle before review completion
- **AND** the evidence bundle names the witness batch, affected surfaces, protected attributes, exceptions, and verification steps

##### Example: Solar and Overview witness batch is declared explicitly

- **GIVEN** an AI-authored change updates `/overview` and `/solar`
- **WHEN** the change is proposed or reviewed
- **THEN** the evidence bundle identifies the playback witness batch for those two pages
- **AND** it records which hero, KPI, chrome, or geometry attributes are protected in that batch

### Requirement: Split FHD work by surface family and reviewable scope

The workflow SHALL require AI-authored FHD work to declare a reviewable surface family and scope boundary before implementation. A single change SHALL NOT silently mix playback visual canonicals, management panel alignment, editor workspace styling, runtime data rewiring, and geometry movement without an explicit split or justification.

#### Scenario: A broad AI change is decomposed before implementation

- **WHEN** an AI-authored change touches multiple high-risk FHD concerns
- **THEN** the workflow decomposes the work into separate witness batches or separate changes
- **AND** each batch records its own protected contracts and verification target

##### Example: Visual and runtime concerns do not share one unbounded change

- **GIVEN** a request mentions playback polish, editor alignment, and launch readiness
- **WHEN** the AI prepares Spectra artifacts
- **THEN** the work is split into separate reviewable scopes rather than one unbounded frontend change
- **AND** each scope names its own evidence and verification pack

### Requirement: Record FHD exceptions as durable review artifacts

The workflow SHALL record any intentional deviation from the witness set or playback visual canonicals in an exception ledger. The exception ledger SHALL identify the affected page or surface, the reason for deviation, the expected user-visible effect, and the residual risk.

#### Scenario: A deviation from the witness set is documented

- **WHEN** an AI-authored change cannot preserve a witness attribute exactly
- **THEN** the exception ledger records the affected surface, the reason, the alternative behavior, and the residual risk
- **AND** the deviation does not remain an undocumented local optimization

##### Example: Operator readability wins over a reference spacing value

- **GIVEN** a management witness page requires slightly looser spacing to keep a control readable
- **WHEN** the AI keeps the readable layout instead of matching the witness exactly
- **THEN** the exception ledger records that spacing deviation and its operator-readability rationale
- **AND** reviewers can distinguish an intentional exception from accidental drift
