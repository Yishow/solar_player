## MODIFIED Requirements

### Requirement: Editor exposes a visibility toggle that persists through draft and live publishing

The editor SHALL expose a visibility toggle control for cards that declare a visibility field, bound to the card's `visible` configuration path. This coverage SHALL include the playback data cards on all five playback pages (overview, solar, factory-circuit, images, and sustainability) and the card rail cards (metric-highlight and household-equivalent), not only the Overview page. Toggling the control SHALL update the page draft, and the draft value SHALL propagate to live through the existing draft and live publishing flow. A hidden card SHALL remain selectable in the editor so an operator can re-enable it.

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

#### Scenario: Visibility toggle is available on non-Overview pages and card rail cards

- **WHEN** the operator opens `/display-pages/editor` for a solar, factory-circuit, images, or sustainability data card, or for a card rail card
- **THEN** the editor exposes a visibility toggle bound to that card's `visible` path
- **AND** toggling it off and publishing makes the playback runtime omit that card

##### Example: Card rail metric-highlight card hidden in draft and live

- **GIVEN** a card rail `metric-highlight` card is visible in the editor draft
- **WHEN** the operator switches its visibility toggle off and publishes the draft
- **THEN** the draft and live configuration record that card's `visible` as `false`
- **AND** the playback runtime omits that card rail card
