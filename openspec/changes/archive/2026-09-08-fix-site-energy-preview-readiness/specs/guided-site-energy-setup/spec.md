## ADDED Requirements

### Requirement: New site setup works without changing an already correct default

The guided task SHALL support a site with no existing profile through source selection, explicit review, actual calculated preview and confirmed application while retaining the correct default site-main denominator. The UI SHALL use server-derived readiness rather than assigning ready as a side effect of changing a select control. Review shall distinguish confirmed configuration, available period values and insufficient historical coverage.

#### Scenario: R10 first setup keeps site-main
- **WHEN** the profile read returns null, the operator selects eligible total and department sources, reviews their coverage and keeps site-main as the denominator
- **THEN** the operator can preview and confirm the valid configuration without toggling the denominator away and back, and the resulting state reflects server-validated evidence

#### Scenario: R10 missing data is saved without false completion
- **WHEN** source choices are valid and reviewed but the requested period has insufficient baseline evidence
- **THEN** the task permits the supported configuration-saving flow, reports waiting for data, and does not promise ready day/month/year totals or bypass publication requirements

### Requirement: Guided review displays actual preview results and recovery states

The final review SHALL render the actual API's period, totals, department values, denominator and quality diagnostics. It SHALL distinguish a missing baseline from failed calculation or failed transport. A source conflict SHALL preserve selections and require a new preview. Testing this task SHALL include the routed parent and real response contract rather than only a mocked numeric preview returned to a child component.

#### Scenario: R9 successful numeric preview is visible
- **WHEN** the real preview response contains an eligible 100 kWh numerator and 400 kWh denominator
- **THEN** review displays those values and 25 percent with their period and quality, not the generic text 尚無差值

#### Scenario: R9 preview failure preserves choices
- **WHEN** preview calculation or its API request fails
- **THEN** the task displays the error, keeps all selections, offers retry and provides no valid confirmation action for that failed preview
