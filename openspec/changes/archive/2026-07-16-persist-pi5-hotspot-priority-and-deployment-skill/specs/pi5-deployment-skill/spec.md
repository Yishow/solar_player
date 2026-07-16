## ADDED Requirements

### Requirement: Provide a repo-local Pi 5 deployment skill

The repository SHALL provide a discoverable skill for requests to deploy, update, verify, reboot, or recover a Solar Player Raspberry Pi 5 kiosk.

#### Scenario: Deployment request triggers the skill

- **WHEN** an operator asks an AI agent to deploy a new Solar Player version to an installed Pi 5
- **THEN** the skill routes the agent through repository deployment conventions and the one-key update entrypoint
- **AND** requires operation-time target and credentials instead of storing them in the skill
- **AND** distinguishes application deployment, host prerequisites, network policy, and unrelated runtime readiness

#### Scenario: Skill metadata is validated

- **WHEN** the repo-local skill is checked with the standard skill validator
- **THEN** its name and description satisfy skill naming and triggering rules
- **AND** its UI metadata names the skill and includes a default prompt that explicitly invokes it

### Requirement: Require evidence gates before and after live deployment

The Pi 5 deployment skill SHALL define concrete local, target, reboot, application, thermal, Wi-Fi, and recovery gates before reporting completion.

#### Scenario: Agent performs an update deployment

- **WHEN** the skill executes an update against an installed Pi
- **THEN** it checks the clean deployment source and release identity
- **AND** runs the repository delivery verification before replacement
- **AND** confirms target reachability, service state, mutable runtime boundaries, and verified backup creation
- **AND** verifies release identity, service, health, kiosk state, and relevant live endpoints after replacement
- **AND** performs a real reboot witness when boot configuration, Wi-Fi priority, autostart, or thermal behavior changed
- **AND** records the rollback material without automatically restoring production runtime state

#### Scenario: Deployment command exits nonzero after replacement

- **WHEN** the one-key command reports a post-replacement verification failure
- **THEN** the skill determines from live service, health, backup, and failing gate evidence whether replacement occurred
- **AND** does not claim success solely from file upload or service activation
- **AND** does not automatically restore the production database

### Requirement: Require Wi-Fi priority and delayed-trigger evidence

The Pi 5 deployment skill SHALL verify both NetworkManager startup preference and delayed hotspot recovery when hotspot management is requested.

#### Scenario: Preferred hotspot is deployed

- **WHEN** the operation selects connection `Yishow`, SSID `Yishow`, and priority `100`
- **THEN** the skill passes those values to the one-key entrypoint
- **AND** verifies the profile and timer configuration before reboot
- **AND** after reboot verifies the first successful wlan0 activation from NetworkManager journal
- **AND** reports separately whether the hotspot was immediately preferred or reached later through the trigger
