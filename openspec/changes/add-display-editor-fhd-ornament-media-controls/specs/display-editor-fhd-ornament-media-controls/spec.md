## ADDED Requirements

### Requirement: Editor SHALL expose FHD media treatment controls without changing media sources

The system SHALL let `/display-pages/editor` expose persisted media treatment controls for supported playback media regions without changing the selected media source, playlist item, or managed asset reference.

#### Scenario: Overview photo fade is editor-backed

- **GIVEN** the operator is editing the `Overview` hero media region
- **WHEN** they change photo fade opacity, fade stop, or mask softness from the inspector
- **THEN** the draft preview SHALL update the media treatment
- **AND** publishing the draft SHALL make `/overview` render the same treatment
- **AND** the resolved hero image source SHALL remain unchanged

#### Scenario: Images media crop does not override playlist active media

- **GIVEN** the `Images` page has an active playlist image
- **WHEN** the operator changes media-stage crop, focus, or framing treatment from the editor
- **THEN** the active playlist image SHALL remain the source of the main stage
- **AND** the treatment SHALL apply around that active media in preview and playback

### Requirement: Editor SHALL expose page-supported ornament treatment controls

The system SHALL let `/display-pages/editor` expose persisted ornament treatment controls for supported page ornaments such as leaves, gold lines, rings, and glow overlays.

#### Scenario: Factory leaf watermark opacity is editor-backed

- **GIVEN** the operator is editing `FactoryCircuit`
- **WHEN** they change the leaf watermark opacity or scale from the inspector
- **THEN** the draft preview SHALL show the updated watermark treatment
- **AND** published playback SHALL keep load values readable

#### Scenario: Sustainability ring overlap is editor-backed

- **GIVEN** the operator is editing the `Sustainability` hero ornament
- **WHEN** they change ring overlap, opacity, or scale from the inspector
- **THEN** the hero media and ring SHALL keep their layered relationship in preview
- **AND** published playback SHALL use the same persisted ring treatment

### Requirement: Invalid treatment values SHALL fall back safely

The system SHALL validate FHD ornament and media treatment values and SHALL fall back to seed baseline when persisted values are missing or invalid.

#### Scenario: Invalid opacity is rejected

- **GIVEN** a persisted ornament opacity is outside the allowed range
- **WHEN** the editor loads or publish validation runs
- **THEN** the editor SHALL surface a validation issue for that ornament
- **AND** preview and playback SHALL use a valid seed or last valid opacity

#### Scenario: Unsupported ornament controls stay hidden

- **GIVEN** a selected page region does not define a ring ornament
- **WHEN** the operator opens the inspector
- **THEN** ring ornament controls SHALL NOT appear
- **AND** the page SHALL continue to render from its seed appearance
