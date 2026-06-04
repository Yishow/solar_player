## ADDED Requirements

### Requirement: Present device status as a summary-first observability dashboard

The system SHALL present `Device Status` as a summary-first observability dashboard.

#### Scenario: Operator opens device status during an incident

- **WHEN** the operator opens `Device Status` during a degraded runtime incident
- **THEN** the page SHALL surface host health, display-operations health, and next-action guidance before deep detail sections

#### Scenario: Dashboard remains distinct from settings workspaces

- **WHEN** the operator navigates from a settings workspace to `Device Status`
- **THEN** the page SHALL remain visually and structurally identifiable as an observability dashboard
- **AND** it SHALL still share the same semantic state language as the settings family

### Requirement: Show safe diagnostics results and host-level escalation guidance together

The system SHALL show safe diagnostics results and host-level escalation guidance together in `Device Status`.

#### Scenario: Operator triggers a safe diagnostics action

- **WHEN** the operator triggers a safe diagnostics action from `Device Status`
- **THEN** the page SHALL show the action's safe scope, result context, and truthful outcome in a first-class result surface

#### Scenario: Operator reaches an unsupported in-app control path

- **WHEN** the requested action requires host-level intervention instead of in-app execution
- **THEN** the page SHALL show explicit host-level escalation guidance
- **AND** it SHALL NOT imply that the application executed the unsupported control

### Requirement: Present alerts, liveness, and logs as triage surfaces instead of generic status stacks

The system SHALL present display alerts, client liveness, and log summaries as triage surfaces instead of generic status stacks.

#### Scenario: Page shows mixed display alerts and client heartbeat state

- **WHEN** display readiness or operational alerts exist alongside client heartbeat data
- **THEN** the page SHALL group those signals into readable triage surfaces with clear purpose and priority

#### Scenario: Operator reviews recent logs for the current incident

- **WHEN** recent log metadata is available
- **THEN** the page SHALL present the log summary as part of the observability triage flow
- **AND** it SHALL help the operator understand whether deeper host-level investigation is required
