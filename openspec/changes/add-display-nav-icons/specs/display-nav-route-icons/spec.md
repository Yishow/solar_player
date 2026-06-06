## ADDED Requirements

### Requirement: Playback footer navigation renders a route icon beside each label

The playback footer navigation SHALL render a route-specific icon beside the text label for each playback route, without changing the route structure, order, count, or label text. Each playback route SHALL map to exactly one icon supplied through route metadata. The navigation SHALL continue to render the existing text label for every route (icon-and-text, not icon-only).

#### Scenario: Each playback route shows an icon and its label

- **WHEN** the playback footer navigation renders its route entries
- **THEN** each entry shows its route-specific icon together with the existing text label

##### Example: Playback route icons use the existing labels

- **GIVEN** the five playback routes keep their existing footer labels `總覽`, `太陽能`, `迴路`, `圖庫`, and `永續`
- **WHEN** the playback footer navigation renders those route entries
- **THEN** it shows route icons `overview`, `solar`, `factory-circuit`, `images`, and `sustainability` beside the matching labels

#### Scenario: Route structure and labels are unchanged

- **WHEN** the playback footer navigation renders with icons
- **THEN** the route paths, order, count, and label text are identical to before icons were added

##### Example: Overview entry renders icon and label

- **GIVEN** the five playback routes Overview, Solar, Factory Circuit, Images, and Sustainability
- **WHEN** the playback footer navigation renders the Overview entry
- **THEN** the Overview entry shows the `overview` route icon next to the existing text label `總覽`
- **AND** the entry still links to the `/overview` path

### Requirement: Management footer navigation is unaffected by route icons

The management mode footer navigation SHALL remain unchanged by this capability and SHALL NOT render route icons.

#### Scenario: Management footer renders without route icons

- **WHEN** the footer navigation renders in management mode
- **THEN** it renders its existing entries without route icons

##### Example: MQTT settings footer remains text-only

- **GIVEN** the management footer renders for `/settings/mqtt`
- **WHEN** the footer shows the existing entries such as `回總覽` and `MQTT`
- **THEN** no management footer entry renders a route icon
