## ADDED Requirements

### Requirement: Resolve playback shell metadata from active registry-backed routes

The system SHALL resolve playback shell metadata from the active display page registry when the current pathname matches a registry-backed playback route, including duplicate template instances and custom route slugs.

#### Scenario: Duplicate template instance uses its own shell metadata

- **WHEN** the current playback pathname matches an active registry-backed duplicate instance of a built-in template
- **THEN** the playback shell SHALL use that instance's resolved route metadata instead of falling back to the canonical built-in route metadata
- **AND** the active navigation state SHALL point to the duplicate instance pathname

##### Example: Overview duplicate keeps its own slug and label

- **GIVEN** the active registry contains `overview` at `/overview` and `overview-2` at `/overview-campus`
- **AND** `overview-2` is enabled and ordered after `overview`
- **WHEN** the browser is showing `/overview-campus`
- **THEN** the playback shell resolves `/overview-campus` as the active playback route
- **AND** the footer highlights `/overview-campus` instead of `/overview`

### Requirement: Build playback footer entries from resolved playback route metadata

The system SHALL build playback footer entries from the resolved active playback route metadata so the playback footer reflects current registry order and active instances.

#### Scenario: Archived route disappears from playback footer

- **WHEN** an active registry-backed playback route is archived or disabled and the client reloads the registry snapshot
- **THEN** the playback footer SHALL remove the archived or disabled route entry
- **AND** the shell SHALL stop marking that pathname as an active playback page

##### Example: Archived campus route no longer appears in footer

- **GIVEN** `/overview-campus` is currently listed in the playback footer from the active registry snapshot
- **WHEN** the `overview-2` registry instance is archived and the shell reloads the registry snapshot
- **THEN** `/overview-campus` is no longer present in the footer entry list
- **AND** navigating to `/overview-campus` no longer resolves as an active playback route

### Requirement: Use resolved playback metadata for offline eligibility

The system SHALL evaluate playback offline eligibility from the resolved playback route metadata rather than from an unknown-route fallback.

#### Scenario: Registry-backed playback route keeps playback-specific offline behavior

- **WHEN** the current pathname matches an active registry-backed playback route
- **THEN** offline redirect decisions SHALL use the resolved playback route metadata for that pathname
- **AND** the shell SHALL NOT treat the route as `/overview` solely because the slug is not present in the static route map
