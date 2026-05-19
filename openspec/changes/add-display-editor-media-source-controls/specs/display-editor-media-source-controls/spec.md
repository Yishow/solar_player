## ADDED Requirements

### Requirement: Editor SHALL expose explicit source modes for persisted display-page media bindings

The system SHALL let the display editor expose explicit source modes for persisted display-page media bindings on `Overview`, `Solar`, `Sustainability`, and `Images`. The chosen mode SHALL determine which media source payload fields are required and how the binding resolves.

#### Scenario: Operator changes a hero media source mode

- **WHEN** the operator selects a hero or stage media region in the editor
- **THEN** the inspector shows a source mode selector and only the payload fields required by that mode
- **AND** saving the draft persists the selected source mode and payload in the media binding

##### Example: Overview hero switches from managed asset to direct source

- **GIVEN** an `Overview` hero binding currently stores a managed asset reference
- **WHEN** the operator changes the source mode to `direct-src` and enters `/uploads/images/hero-overview.png`
- **THEN** the saved binding records `sourceMode=direct-src`
- **AND** the preview resolves `/uploads/images/hero-overview.png`

### Requirement: Images main stage fallback source SHALL remain separate from playlist active media

The system SHALL keep the `Images` main stage fallback source separate from the active playlist media so editor-configured fallback bindings do not override a valid playlist entry.

#### Scenario: Playlist entry still wins over fallback source

- **WHEN** the `Images` page has a valid active playlist entry
- **THEN** the main stage renders the active playlist media
- **AND** the editor-configured fallback source remains inactive until the playlist entry is unavailable or fallback policy requires it

##### Example: Images fallback source is ignored while playlist media exists

- **GIVEN** the `Images` page stores `sourceMode=direct-src` with `/brand-logo.png` as its fallback source
- **AND** the active playlist entry resolves `/uploads/images/gallery-03.jpg`
- **WHEN** the page renders normally
- **THEN** the main stage shows `/uploads/images/gallery-03.jpg`
- **AND** `/brand-logo.png` is reserved for fallback conditions only

### Requirement: Media source mode changes SHALL preserve existing placement controls

The system SHALL preserve existing media placement controls when the operator changes source mode so fit, focus, and alignment remain editable across all supported modes.

#### Scenario: Placement controls remain active after source change

- **WHEN** the operator changes a media binding from one source mode to another
- **THEN** the binding still exposes `fitMode`, `focusX`, `focusY`, `alignX`, and `alignY`
- **AND** preview and playback use the same placement values with the resolved media source

##### Example: Solar hero keeps cover crop after switching source mode

- **GIVEN** a `Solar` hero binding stores `fitMode=cover`, `focusX=0.5`, and `focusY=0.52`
- **WHEN** the operator changes the source mode from `managed-asset` to `seed-default`
- **THEN** the preview still applies `cover` with `focusX=0.5` and `focusY=0.52`
