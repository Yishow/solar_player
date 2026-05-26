## ADDED Requirements

### Requirement: Supported hero and media surfaces store bounded display effect settings
The system SHALL let supported hero and media surfaces store bounded display effect settings instead of relying only on raw page-local CSS. The first release SHALL support effect groups needed for the current visual regressions, including edge fade, blur, and overlay-style adjustments where those surfaces support them.

#### Scenario: Operator saves a bounded effect adjustment for a supported surface
- **WHEN** the operator changes effect settings for a supported hero or media surface
- **THEN** the page draft stores those effect settings in structured form
- **AND** the saved values remain within the allowed bounds for that effect group

##### Example: Overview hero stores a left-edge fade and blur setting
- **GIVEN** the Overview hero surface supports edge fade and blur controls
- **WHEN** the operator reduces the left-edge fade width and increases the blur amount within allowed bounds
- **THEN** the Overview draft stores those effect settings in the hero effect group
- **AND** the values remain inside the configured min and max ranges

### Requirement: Editor preview and playback runtime resolve the same display effect settings
The system SHALL resolve supported display effect settings through the same effect resolver for editor preview and playback runtime. Effect-backed surfaces SHALL remain visually consistent across authoring and production routes.

#### Scenario: Preview and playback show the same hero effect result
- **WHEN** a page draft or live config contains supported effect settings
- **THEN** the editor preview and playback runtime apply the same visual effect interpretation
- **AND** the surface does not require page-local duplicate logic to keep them aligned

##### Example: Overview preview and playback keep the same left-edge fade behavior
- **GIVEN** the Overview hero effect group contains a left-edge fade and blur configuration
- **WHEN** the operator views the page in editor preview and then opens the playback route
- **THEN** both surfaces show the same left-edge fade and blur treatment
- **AND** neither surface falls back to a separate hardcoded CSS-only variant

### Requirement: Effect settings fall back safely when values or surfaces are unsupported
The system SHALL fall back safely when effect settings are invalid, out of range, or applied to unsupported surfaces. Invalid effect data SHALL NOT make the hero or media surface disappear.

#### Scenario: Unsupported or invalid effect payload uses safe defaults
- **WHEN** a saved effect payload contains unsupported values or targets a surface that does not support that effect group
- **THEN** the resolver falls back to safe defaults for that surface
- **AND** the media still renders visibly

##### Example: Blur value exceeds the supported maximum
- **GIVEN** a hero effect group stores a blur amount above the supported maximum
- **WHEN** the resolver applies that effect group
- **THEN** the blur value is clamped or reset to a safe default
- **AND** the hero media still renders instead of disappearing
