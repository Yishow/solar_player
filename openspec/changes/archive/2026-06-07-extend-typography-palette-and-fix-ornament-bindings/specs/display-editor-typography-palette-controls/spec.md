## ADDED Requirements

### Requirement: Playback copy typography controls are editor-backed

The system SHALL expose persisted editor controls for Sustainability English copy typography, Factory Circuit English copy typography, and Images lead copy typography. The playback runtime SHALL consume the resolved config values instead of relying only on page-local CSS hardcoded font size, line height, or letter spacing.

#### Scenario: Sustainability English copy uses resolved typography

- **GIVEN** the Sustainability display config sets copy typography with secondary font size `16`, line height `1.7`, and margin top `18`
- **WHEN** `/sustainability` renders from that config
- **THEN** the English copy block uses those resolved values
- **AND** the copy text content remains unchanged

#### Scenario: Factory English copy uses resolved typography

- **GIVEN** the Factory Circuit display config sets copy typography with secondary font size `20`, line height `1.6`, and margin top `20`
- **WHEN** `/factory-circuit` renders from that config
- **THEN** the English copy block uses those resolved values
- **AND** the Factory copy text remains page-configurable

#### Scenario: Images lead copy uses resolved typography

- **GIVEN** the Images display config sets copy font size `26`, line height `1.6`, and letter spacing `0.5`
- **WHEN** `/images` renders from that config
- **THEN** the lead copy block uses those resolved values

### Requirement: Sustainability green palette tokens are editor-backed

The system SHALL expose persisted editor controls for Sustainability green palette tokens used by value, icon, and accent treatments. The playback runtime SHALL use resolved palette values rather than CSS-only hardcoded green values.

#### Scenario: Sustainability palette controls affect value and icon greens

- **GIVEN** the Sustainability display config sets `valueColor` to `#57774a` and `iconColor` to `#6a8a50`
- **WHEN** `/sustainability` renders KPI/stat cards and highlight values
- **THEN** those surfaces use the resolved palette values
- **AND** missing or invalid palette values fall back to seed values without blanking the page

### Requirement: Factory KPI card typography is editor-backed

The system SHALL expose persisted editor controls for Factory Circuit KPI card title, subtitle, value, and unit sizing by reusing the existing `DisplayCardStyleConfig` model.

#### Scenario: Factory KPI card uses resolved card style

- **GIVEN** the Factory Circuit display config sets KPI `totalPower` value font size to `58`
- **WHEN** `/factory-circuit` renders the total power KPI
- **THEN** the KPI card uses the resolved card style value size
- **AND** the metric value still comes from the existing Factory runtime view model

### Requirement: Leaf ornament opacity and rotation bindings match config

The system SHALL apply leaf ornament opacity and rotation directly from resolved display chrome config for Factory Circuit and Sustainability. The system SHALL NOT normalize Factory leaf opacity against the seed value.

#### Scenario: Factory leaf opacity equals configured opacity

- **GIVEN** the Factory Circuit seed config sets leaf opacity to `0.38`
- **WHEN** `/factory-circuit` renders the leaf watermark
- **THEN** the rendered style contains opacity `0.38`
- **AND** it does not divide the configured opacity by the seed opacity

#### Scenario: Sustainability leaf rotation comes from config

- **GIVEN** the Sustainability display config sets leaf rotation to `-28`
- **WHEN** `/sustainability` renders the leaf ornament
- **THEN** the rendered style sets `--display-leaf-rotation` to `-28deg`
- **AND** missing rotation falls back to the seed rotation
