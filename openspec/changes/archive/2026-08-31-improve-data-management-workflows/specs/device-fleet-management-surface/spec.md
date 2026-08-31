## ADDED Requirements

### Requirement: Device and Group mutations use typed management controls

Device Fleet SHALL provide typed dialogs, drawers, or equivalent structured controls for Device and Group create/edit operations. The primary workflow MUST NOT require an operator to type raw Group ids, free-form Site Scope codes, or use browser `window.prompt` dialogs for supported fields.

#### Scenario: Operator edits a Device Group assignment
- **WHEN** an operator edits an existing Device
- **THEN** the management control provides selectable valid Groups with resolved site/profile context
- **AND** the operator is not required to know or type the internal Group id

#### Scenario: Operator edits a Group
- **WHEN** an operator creates or edits a Group
- **THEN** Site Scope is selected from supported CL/KN choices
- **AND** Playback Profile is selected from valid profiles
- **AND** validation errors remain in the structured management surface

### Requirement: Pairing configuration is based on Device Group context, not MQTT topics

The pairing workflow SHALL assign or confirm the Device's Group and resulting Site Scope/Playback Profile before or during pairing. It MUST NOT present raw MQTT topic checkboxes as the mechanism that determines what site data the Pi receives.

#### Scenario: Pair a KN lobby display
- **WHEN** an operator prepares a new KN lobby Device for pairing
- **THEN** the workflow assigns/selects the KN Group and shows its resolved Site Scope and Playback Profile
- **AND** the issued Device Credential later resolves that trusted context
- **AND** no MQTT broker credential or topic selection is stored on the Pi for normal playback

### Requirement: Device Fleet does not require a Data Profile for current two-site deployment

The Device/Group management surface SHALL continue to model Site Scope and Playback Profile as the current Group-level playback assignments. A Data Profile field MUST NOT be required for ordinary CL/KN Device creation, editing, or pairing in this change.

#### Scenario: Create both current site players
- **WHEN** an operator creates one CL display Device and one KN display Device in valid Groups
- **THEN** both can be paired and played using Group Site Scope plus Playback Profile
- **AND** neither workflow is blocked by a missing Data Profile
