## ADDED Requirements

### Requirement: Device Fleet shares refreshed Profile catalogs across tabs

After a successful authoritative Profile catalog refresh following create, rename, or archive, Device Fleet SHALL expose that same catalog to the embedded Profile tab and group assignment controls without a full-page reload. Publishing the catalog SHALL update only Profile catalog state and SHALL preserve unrelated fleet state and input in group forms that are mounted when the catalog is published. Existing tab-driven form unmount and reset behavior SHALL remain unchanged. The standalone Playback Profiles route SHALL continue to function without a Fleet catalog subscriber.

#### Scenario: Created Profile survives tab navigation and is assignable

- **GIVEN** the Profile tab initially lists Default
- **WHEN** the user creates New Test Profile and its authoritative catalog refresh succeeds, then switches to the Devices tab
- **THEN** New Test Profile SHALL be available in both new-group and edit-group assignment controls
- **AND** returning to the Profile tab SHALL still display New Test Profile without a full-page reload

#### Scenario: Rename and archive update catalog consumers

- **WHEN** a Profile rename refresh succeeds
- **THEN** the Profile tab and group assignment controls SHALL display the refreshed name
- **WHEN** a subsequent archive refresh succeeds
- **THEN** that Profile SHALL no longer be offered for new assignment under existing selectability rules
- **AND** existing resolved group context SHALL retain its established display and diagnostic behavior

#### Scenario: Catalog publication preserves unrelated state

- **GIVEN** a catalog refresh is pending, the user returns to Devices and enters values in its now-mounted group form, and Fleet has devices, groups, liveness, and filter state
- **WHEN** a successful Profile catalog snapshot is published to Fleet
- **THEN** only the profiles slice SHALL change
- **AND** the group form values and unrelated Fleet state SHALL remain intact

#### Scenario: Failed refresh preserves the last successful catalog

- **GIVEN** a mutation succeeds but the following catalog request fails
- **WHEN** the Profile management surface handles that failure
- **THEN** it SHALL retain the last successful catalog and expose an error with a reload-catalog action
- **AND** retry SHALL request only the catalog without repeating the successful create, rename, or archive mutation
- **AND** it SHALL NOT publish an empty catalog or report that synchronization succeeded
- **WHEN** retry returns a successful catalog, including a valid empty catalog
- **THEN** the returned authoritative catalog SHALL be published to both consumers

#### Scenario: Standalone Profile management remains compatible

- **WHEN** Playback Profiles is mounted through its standalone route with no Fleet catalog callback
- **THEN** create, rename, archive, refresh, and failure handling SHALL retain their existing behavior
