## ADDED Requirements

### Requirement: Drive Factory Circuit playback from the shared display-story slot contract

The implementation SHALL make the `/factory-circuit` playback route resolve slot rows, binding state, and summary status from the shared `/api/display-story` factory circuit payload instead of rebuilding the playback story only from `/api/circuits`.

#### Scenario: Factory Circuit playback loads shared slot states

- **WHEN** `/factory-circuit` requests the shared display story payload
- **THEN** the route uses `factoryCircuit.slots` and `factoryCircuit.summary` as its primary playback source
- **AND** `/api/circuits` remains a settings-side governance source rather than the playback truth source

##### Example: Slot rows come from the shared playback contract

- **GIVEN** `/api/display-story` returns six factory circuit slots with binding states and live power values
- **WHEN** the playback page renders `/factory-circuit`
- **THEN** each load row reflects the corresponding shared slot state
- **AND** the page does not rebuild a second independent slot-binding interpretation from the circuits settings response alone

### Requirement: Preserve readable playback when slot story data is degraded

The implementation SHALL preserve a readable Factory Circuit playback page when a slot is unbound, conflicted, missing live power, or the shared story request fails.

#### Scenario: Factory Circuit has a missing slot binding

- **WHEN** one slot in the shared factory circuit payload is marked as missing or conflict
- **THEN** that row shows a predictable degraded or fallback state
- **AND** the rest of the playback page continues to render normally

##### Example: One row is degraded without collapsing the page

- **GIVEN** the `ev` slot in `/api/display-story` is returned with `bindingState = missing`
- **WHEN** `/factory-circuit` renders the load rows
- **THEN** the EV row shows a readable missing-binding state
- **AND** the other rows and summary panel remain visible with their own shared story data
