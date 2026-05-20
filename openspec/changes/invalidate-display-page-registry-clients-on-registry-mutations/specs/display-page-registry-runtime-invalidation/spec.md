## ADDED Requirements

### Requirement: Invalidate display page registry clients after registry mutations

The system SHALL invalidate registry-consuming clients after a display page registry mutation so they can reload the latest registry snapshot.

#### Scenario: Registry page is archived

- **WHEN** a display page instance is archived in the registry
- **THEN** registry-consuming clients SHALL reload the registry snapshot
- **AND** they SHALL stop treating the archived page as if it were still an active route definition

##### Example: Route host drops an archived route

- **GIVEN** a registry-backed playback route existed before the archive action
- **WHEN** the archive mutation completes and the client receives the relevant mutation signal
- **THEN** the route host reloads the registry snapshot
- **AND** navigating to the archived route resolves through the existing fallback path instead of the stale page definition

### Requirement: Rebuild editor and route definitions from the latest registry snapshot

The system SHALL rebuild registry-derived editor and route definitions from the latest registry snapshot after create or update mutations.

#### Scenario: New page appears in the editor after creation

- **WHEN** a new display page instance is created in the registry
- **THEN** the editor route SHALL rebuild its page definitions from the updated registry snapshot
- **AND** the new page becomes available without requiring a full browser reload

##### Example: Editor navigation exposes a newly created page

- **GIVEN** the editor is open while the registry-backed page list does not yet include `sustainability`
- **WHEN** a create mutation for `sustainability` completes and the client receives the relevant mutation signal
- **THEN** the editor rebuilds its page definitions from the refreshed registry snapshot
- **AND** the page picker exposes `sustainability` without a manual browser reload
