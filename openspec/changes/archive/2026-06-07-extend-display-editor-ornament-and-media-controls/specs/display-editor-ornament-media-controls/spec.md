## ADDED Requirements

### Requirement: Media tone effects are editor-backed

The system SHALL expose full-frame media tone controls for supported display media surfaces. Tone controls SHALL include saturation and contrast and SHALL be represented through the shared media effect model.

#### Scenario: Tone layer applies saturation and contrast

- **GIVEN** a display media binding has an enabled full-frame tone layer with saturation `1.18` and contrast `1.08`
- **WHEN** the runtime builds the media presentation for that binding
- **THEN** the media style filter includes `saturate(1.18)` and `contrast(1.08)`
- **AND** existing full-frame blur and opacity behavior remains available

#### Scenario: Media effect inspector can create tone layers

- **GIVEN** a media effect surface advertises tone support
- **WHEN** the editor appends a tone effect layer
- **THEN** the new layer uses the full-frame zone
- **AND** the inspector renders editable saturation and contrast controls

### Requirement: Ornament base geometry is editor-backed

The system SHALL store ornament base geometry in display chrome config when a playback ornament currently depends on page-local hardcoded base layout. Runtime SHALL apply offsets relative to the configured base geometry.

#### Scenario: Solar gold line uses configured base geometry and rotation

- **GIVEN** the Solar display config sets gold line base left `0`, top `500`, width `1075`, and rotation `-4`
- **WHEN** `/solar` renders
- **THEN** the gold line style uses those resolved base values
- **AND** the rotation is applied through the display gold-line CSS variable

#### Scenario: Solar leaf uses configured base geometry

- **GIVEN** the Solar display config sets leaf base left `565`, top `330`, width `190`, and height `132`
- **WHEN** `/solar` renders
- **THEN** the leaf ornament style uses those resolved base values plus configured offsets

#### Scenario: Sustainability leaf uses configured base geometry

- **GIVEN** the Sustainability display config sets leaf base left `520`, top `564`, width `178`, and height `96`
- **WHEN** `/sustainability` renders
- **THEN** the leaf ornament style uses those resolved base values plus configured offsets
- **AND** missing base geometry falls back to seed values

### Requirement: Images stage and thumbnail framing are editor-backed

The system SHALL expose editor-backed Images main stage and thumbnail framing controls. Runtime SHALL use resolved config for stage radius, shadow, full-bleed mode, and thumbnail radius instead of relying on active image source identity.

#### Scenario: Images full-bleed framing is config-driven

- **GIVEN** the Images display config sets main stage `fullBleed` to `true`
- **WHEN** `/images` renders the main stage
- **THEN** the stage uses zero radius and no shadow
- **AND** media overlays and the info card are hidden because of config
- **AND** runtime does not use `isReferenceHeroCrop` to decide this framing

#### Scenario: Images thumbnail radius uses resolved config

- **GIVEN** the Images display config sets thumbnail radius to `28`
- **WHEN** `/images` renders thumbnails
- **THEN** thumbnail buttons and thumbnail images use the resolved radius

### Requirement: Existing ring treatment remains wired

The system SHALL keep Sustainability ring thickness and glow opacity editor-backed through the existing ring ornament chrome config.

#### Scenario: Sustainability ring keeps existing thickness and glow fields

- **GIVEN** the Sustainability editor regions include the ring ornament region
- **WHEN** the ring region fields are inspected
- **THEN** it exposes ring thickness and ring glow opacity fields
- **AND** runtime applies `--display-ring-thickness` and `--display-ring-glow-opacity`
