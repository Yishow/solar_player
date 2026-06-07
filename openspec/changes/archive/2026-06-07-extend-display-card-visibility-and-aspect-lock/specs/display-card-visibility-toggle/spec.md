## ADDED Requirements

### Requirement: Display card visibility is controlled by a per-card visible flag

The system SHALL honor a per-card `visible` boolean flag on display card configuration. When a card's `visible` flag is `false`, the playback runtime SHALL NOT render that card. When the flag is `true` or absent, the playback runtime SHALL render that card. A card configuration that omits the `visible` flag SHALL be treated as visible, so existing drafts without the flag continue to render unchanged.

#### Scenario: Hidden card is not rendered at playback

- **WHEN** a display card's configuration sets `visible` to `false`
- **THEN** the playback runtime does not render that card

#### Scenario: Card without a visible flag still renders

- **WHEN** a display card's configuration omits the `visible` flag
- **THEN** the playback runtime renders that card as visible

##### Example: Overview KPI card hidden then restored

- **GIVEN** the Overview page has five KPI cards each defaulting to `visible` true
- **WHEN** the `power` KPI card configuration is set to `visible` false
- **THEN** the Overview playback output omits the `power` KPI card
- **AND** setting it back to `visible` true restores the rendered card

### Requirement: Editor exposes a visibility toggle that persists through draft and live publishing

The editor SHALL expose a visibility toggle control for cards that declare a visibility field, bound to the card's `visible` configuration path. Toggling the control SHALL update the page draft, and the draft value SHALL propagate to live through the existing draft and live publishing flow. A hidden card SHALL remain selectable in the editor so an operator can re-enable it.

#### Scenario: Operator toggles visibility and publishes

- **WHEN** the operator switches a card's visibility toggle off in the editor
- **THEN** the page draft records that card as not visible
- **AND** publishing the draft propagates the hidden state to the live display

##### Example: Overview power KPI is hidden in draft and live

- **GIVEN** the Overview `power` KPI card is visible in the editor draft
- **WHEN** the operator switches the `power` KPI visibility toggle off and publishes the draft
- **THEN** the draft and live configuration record `kpiCards.power.visible` as `false`
- **AND** the playback runtime omits the `power` KPI card

#### Scenario: Hidden card remains editable

- **WHEN** a card is hidden in the editor
- **THEN** the card remains present and selectable in the editor region list
- **AND** the operator can switch its visibility back on

##### Example: Hidden Overview KPI stays in the editor region list

- **GIVEN** the Overview `power` KPI card configuration has `visible` set to `false`
- **WHEN** the operator opens `/display-pages/editor` for Overview
- **THEN** the `overview-kpi-power` region remains selectable
- **AND** the visibility toggle can set `kpiCards.power.visible` back to `true`
