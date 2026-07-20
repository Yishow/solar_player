## ADDED Requirements

### Requirement: Align the MQTT settings page as a dedicated high-risk change

The implementation SHALL align `/settings/mqtt` as a dedicated high-risk change rather than bundling it with lower-risk settings pages.

#### Scenario: The MQTT change starts

- **WHEN** this change begins
- **THEN** it only covers `/settings/mqtt`
- **AND** it treats broker config, topic mapping, status display, and action feedback as first-class concerns

##### Example:

- **GIVEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` is the prototype source
- **WHEN** this change is applied
- **THEN** it maps only to `/settings/mqtt`
- **AND** the change includes explicit validation for high-risk interaction flows

### Requirement: Preserve MQTT save, test, topic-mapping, and feedback behavior

The implementation SHALL preserve load, save, test connection, topic mapping, status feedback, and error feedback semantics.

#### Scenario: MQTT actions succeed or fail

- **WHEN** an operator loads settings, saves broker config, saves topics, or tests a connection
- **THEN** the route keeps the existing functional contract
- **AND** the UI surfaces both success and failure states explicitly

##### Example:

- **GIVEN** the broker is unreachable during test connection
- **WHEN** the operator triggers the test action
- **THEN** the route shows a failed state and message outcome instead of appearing silently successful
- **AND** the evidence bundle records that failure path
