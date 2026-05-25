## ADDED Requirements

### Requirement: Store shared shell decoration objects separately from page configs
The system SHALL store shared shell decoration objects in a dedicated shared configuration envelope instead of any individual display page config. The envelope SHALL provide separate `draft` and `live` channels and SHALL keep `headerObjects` and `footerObjects` distinct so the whole shell can be authored without assigning ownership to a single page.

#### Scenario: Operator saves draft shell decoration changes
- **WHEN** an operator saves shell decoration changes without publishing them
- **THEN** the system stores those changes in the shared shell decoration `draft` channel
- **AND** the current `live` shell decoration configuration remains unchanged for playback routes

##### Example: Draft header line does not replace live footer ornament
- **GIVEN** the current `live` shell decoration config contains one footer ornament object
- **AND** the operator saves a `draft` config containing two header line objects
- **WHEN** the draft save completes
- **THEN** the `draft.headerObjects` list contains the two line objects
- **AND** the `live.footerObjects` list still contains the original ornament object

### Requirement: Shell decoration objects use a shared base object schema
The system SHALL define shell decoration objects with a shared base object schema that can also be reused by future page freeform objects. Each shell decoration object SHALL include a stable `id`, a supported `type`, a `mount`, a `frame`, visibility and lock flags, deterministic z-order metadata, and a typed source or style payload.

#### Scenario: Stored shell object exposes the common object fields
- **WHEN** a shell decoration object is read from the shared contract
- **THEN** the object includes the base object fields required for future shared tooling
- **AND** the `mount` value is restricted to `header` or `footer`

##### Example: Header asset image object uses the shared shape
- **GIVEN** a stored shell object of type `asset-image`
- **WHEN** the object is returned through the shared shell decoration contract
- **THEN** it includes `id`, `type`, `mount`, `frame`, `visible`, `locked`, `zIndex`, `source`, `style`, and `metadata`
- **AND** `mount` equals `header`

### Requirement: Shell decoration publish validation enforces band-safe geometry and supported sources
The system SHALL validate shell decoration objects before publish. Validation SHALL reject objects whose frames overflow their header or footer band, whose type is unsupported, whose source payload is malformed, or whose ordering cannot be resolved deterministically.

#### Scenario: Publish rejects a header object that leaves the header band
- **WHEN** a shell decoration object mounted to `header` extends outside the allowed header band
- **THEN** the publish request is rejected
- **AND** the validation findings identify the offending object instead of silently clipping it

##### Example: Header line crosses into the content band
- **GIVEN** the header band height is `110`
- **AND** a `header` line object stores `top=96` and `height=28`
- **WHEN** the operator tries to publish the shell decoration config
- **THEN** publish is rejected because the object crosses the header band boundary
- **AND** the finding names that line object's `id`

#### Scenario: Publish rejects malformed source payloads
- **WHEN** a shell decoration object uses `asset-image` or `ornament-image` with a malformed source payload
- **THEN** the publish request is rejected
- **AND** the validation findings explain whether the failure came from an unsupported source mode or an incomplete asset reference

##### Example: Asset image object omits the managed asset reference
- **GIVEN** a footer object of type `asset-image`
- **AND** its source payload omits the required managed asset reference and fallback source
- **WHEN** the operator tries to publish the config
- **THEN** publish is rejected
- **AND** the validation finding identifies the malformed source payload for that object
