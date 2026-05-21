## MODIFIED Requirements

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

#### Scenario: Playback shell metadata consumers reload after route metadata changes

- **WHEN** a display page registry mutation changes an active playback route's slug, enabled state, display order, or display name
- **THEN** playback shell metadata consumers SHALL reload the latest registry snapshot
- **AND** playback footer entries, active route state, and route metadata resolution SHALL converge on the updated snapshot without a full browser reload

##### Example: Footer order follows the updated registry snapshot

- **GIVEN** a playback footer is rendering entries from the latest active registry snapshot
- **WHEN** an operator changes a registry-backed page's display order or route slug and the mutation completes
- **THEN** the footer reloads the registry snapshot
- **AND** the active playback route metadata reflects the updated order or slug without a manual browser refresh
