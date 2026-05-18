## ADDED Requirements

### Requirement: Drive Solar playback storytelling from the shared display-story contract

The implementation SHALL make the `/solar` playback route consume the shared `/api/display-story` solar payload for flow state and KPI storytelling instead of resolving the same playback story only from page-local metric logic.

#### Scenario: Solar playback loads the shared story payload

- **WHEN** `/solar` requests the shared display story contract
- **THEN** the route uses `solar.story.flowState` and `solar.kpis` as its primary playback source
- **AND** the existing FHD node, connector, and hero layout remains unchanged

##### Example: Flow state and KPIs come from one shared runtime payload

- **GIVEN** `/api/display-story` returns a `solar` payload with a degraded flow state and resolved KPI entries
- **WHEN** `/solar` renders the playback page
- **THEN** the flow nodes and KPI cards reflect that shared payload
- **AND** the route does not re-derive an independent second solar story from local-only logic

### Requirement: Keep Solar comparison and fallback behavior readable during partial degradation

The implementation SHALL keep `/solar` readable when comparison targets or individual KPI readings are missing from the shared story payload.

#### Scenario: A Solar comparison target is unavailable

- **WHEN** a `solar` KPI has a valid actual value but no comparison target in the shared payload
- **THEN** the playback route shows a predictable fallback comparison state
- **AND** the rest of the Solar story remains playable

##### Example: One comparison is unavailable but the page still renders

- **GIVEN** the shared solar payload includes flow state and KPI values but omits the comparison target for `systemEfficiency`
- **WHEN** `/solar` renders that KPI card
- **THEN** the comparison area shows an unavailable or fallback state for that card
- **AND** the other cards and flow storytelling continue to use the shared payload normally
