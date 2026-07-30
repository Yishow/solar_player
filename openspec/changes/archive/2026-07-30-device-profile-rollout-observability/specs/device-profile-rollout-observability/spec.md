## ADDED Requirements

### Requirement: Assign a Desired Version to target Groups

Publishing a Profile Version SHALL assign that Version as desiredVersion to every enabled Group that references the Profile. The assignment SHALL NOT overwrite any Device's appliedVersion.

#### Scenario: Publish to online and offline Devices

- **WHEN** a Profile Version is published to a Group containing online and offline Devices
- **THEN** the Group desiredVersion changes immediately
- **AND** each Device retains its prior appliedVersion until it reports a successful application

##### Example: Two Devices retain Version 7

- **GIVEN** an enabled Group has one online Device and one offline Device, both appliedVersion=7
- **WHEN** Version 8 is published for that Group's Profile
- **THEN** the Group becomes desiredVersion=8
- **AND** both Devices remain appliedVersion=7

### Requirement: Apply Profile Versions at a Safe Playback Boundary

A Client SHALL download and validate its Desired Version before marking updateState=waiting. It SHALL apply the Version after the current valid page duration, or at the next transition tick when the current page is invalid in the new rotation.

#### Scenario: Current page remains valid

- **WHEN** a waiting Version still contains the current page
- **THEN** the Client completes the current page duration
- **AND** the next page uses the new Version

##### Example: Solar finishes before Version 8 applies

- **GIVEN** Version 7 is playing Solar with 12 seconds remaining
- **WHEN** validated Version 8 also contains Solar
- **THEN** the Client waits 12 seconds
- **AND** the next page is selected from Version 8

#### Scenario: Candidate validation fails

- **WHEN** the Desired Version snapshot fails schema or asset-reference validation
- **THEN** the Client retains the prior Applied Version
- **AND** reports updateState=failed with a bounded diagnostic

##### Example: Unsupported snapshot schema

- **GIVEN** a Device has appliedVersion=7
- **WHEN** desiredVersion=8 carries schemaVersion=2
- **THEN** appliedVersion remains 7
- **AND** updateState is failed with a diagnostic no longer than 160 characters

### Requirement: Report desired, applied, and update state per Device

Each heartbeat SHALL report desiredVersion, appliedVersion, and exactly one updateState of waiting, applied, or failed. The Server SHALL compare those values with its assignment and SHALL NOT accept a Client-reported desired version as authoritative.

#### Scenario: Offline Client reconnects

- **WHEN** a Device reconnects with appliedVersion lower than its Group desiredVersion
- **THEN** the Server exposes the Desired Version
- **AND** the Client resumes validation and safe application without blocking other Devices

##### Example: Version 7 reconnects to Desired Version 9

- **GIVEN** an offline Device last applied Version 7 while its Group now desires Version 9
- **WHEN** the Device reconnects
- **THEN** the Server returns desiredVersion=9 and appliedVersion=7
- **AND** other Devices continue reporting and applying independently

### Requirement: Derive fleet rollout summaries

The management surface SHALL derive applied, waiting, offline, and failed counts from Device desired/applied state and liveness. It SHALL preserve each Device's last applied version while offline.

#### Scenario: One of fifty Devices fails

- **WHEN** 49 Devices report the Desired Version applied and one reports failed
- **THEN** the fleet summary reports applied=49 and failed=1
- **AND** the failed Device continues to identify its previous Applied Version
