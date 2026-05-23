## MODIFIED Requirements

### Requirement: Stream MQTT runtime preview feedback to the management surface

The system SHALL stream MQTT runtime preview feedback to `MQTT Settings` so operators can see near-real-time topic activity and broker status inside the editable topic overview workspace.

#### Scenario: Topic starts receiving values

- **WHEN** a mapped MQTT topic starts receiving runtime values while `MQTT Settings` is open
- **THEN** the management surface SHALL reflect that topic activity without waiting for a coarse periodic reload only
- **AND** the operator SHALL be able to see that the topic is now active from the same topic row they use for editing

### Requirement: Preserve a readable fallback when live MQTT preview streaming is unavailable

The system SHALL preserve a readable fallback when near-real-time MQTT preview updates are unavailable, even after the runtime preview is merged into the editable topic overview card.

#### Scenario: Live preview updates are unavailable

- **WHEN** the management surface cannot receive near-real-time topic preview updates
- **THEN** it SHALL show a degraded or fallback state for the runtime preview
- **AND** it SHALL NOT present the preview as if it were fully live

##### Example: Streaming channel disconnect falls back to polled preview

- **GIVEN** `MQTT Settings` was showing live topic activity through a streaming channel
- **WHEN** the streaming connection drops while periodic preview polling still works
- **THEN** the page marks the runtime preview as degraded or fallback
- **AND** it does not continue labeling the preview as fully live until streaming resumes
