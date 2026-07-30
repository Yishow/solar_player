## ADDED Requirements

### Requirement: Preserve Device Fleet CRUD and status behavior across rendering changes

Rendering optimization or component reuse on the Device Fleet surface SHALL preserve Device and Group mutations, pairing confirmation, explicit operational states, and management access gating.

#### Scenario: Fleet row rendering is optimized

- **WHEN** the Device Fleet table implementation changes without a product requirement change
- **THEN** existing component tests for CRUD actions, pairing state, duplicate warnings, and access gating remain unchanged and pass
