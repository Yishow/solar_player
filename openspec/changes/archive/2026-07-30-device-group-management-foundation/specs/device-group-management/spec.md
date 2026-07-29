## ADDED Requirements

### Requirement: Persist stable devices and flat groups

The system SHALL persist each Device with a globally unique human-readable clientId, a displayName, an enabled state, and exactly one Group reference when the Device is enabled. Each Group SHALL have a unique name, an enabled state, a Site Scope of cl or kn, and a valid Playback Profile reference.

#### Scenario: Create an enabled Device in a valid Group

- **WHEN** a trusted management caller creates enabled Device lobby-cl-01 in an enabled cl Group that references the Default Playback Profile
- **THEN** the system stores the Device and returns its resolved Group, Site Scope, and Profile summary

#### Scenario: Reject an enabled Device without an active Group

- **WHEN** a trusted management caller creates or enables a Device without an enabled Group
- **THEN** the system rejects the mutation with a stable validation code
- **AND** it SHALL NOT persist a partially enabled Device

### Requirement: Keep group assignment unambiguous

The system SHALL model Device membership as a single Group reference. It SHALL NOT support nested Groups, multiple simultaneous Group memberships, arbitrary Site Scope values, or per-device playback overrides.

#### Scenario: Move a Device between Groups

- **WHEN** a trusted management caller moves a Device from a cl Group to a kn Group
- **THEN** the Device SHALL reference only the kn Group after the transaction commits
- **AND** no cl Group membership SHALL remain

### Requirement: Protect Device and Group management mutations

Device and Group create, update, enable, disable, and delete operations SHALL use the existing management mutation access boundary.

#### Scenario: Playback session attempts a Group mutation

- **WHEN** an untrusted playback session submits a Device Group mutation
- **THEN** the system rejects it with the existing management access denied envelope
- **AND** no Device or Group state changes

### Requirement: Preserve referential integrity during Group lifecycle changes

The system SHALL reject deletion of a Group that is referenced by any Device. Disabling a Group SHALL retain its Device references and SHALL make those Devices ineligible for formal playback context.

#### Scenario: Delete a referenced Group

- **WHEN** a trusted management caller deletes a Group referenced by one or more Devices
- **THEN** the system returns 409 with code group_in_use
- **AND** the Group and Device references remain unchanged
