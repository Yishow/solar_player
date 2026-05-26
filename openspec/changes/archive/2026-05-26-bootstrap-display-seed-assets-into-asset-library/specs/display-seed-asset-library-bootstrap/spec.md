## ADDED Requirements

### Requirement: Current display seed visuals are bootstrapped into managed asset library

The system SHALL bootstrap current display seed visual assets into the managed asset library so existing backgrounds, main-stage images, card icons, flow or node icons, thumbnails, and ornament fallback visuals are visible as catalog items without requiring manual upload.

#### Scenario: Operator opens Asset Library after database seed

- **WHEN** the system database has been migrated and seeded
- **THEN** Asset Library includes managed asset rows for the current display seed visuals
- **AND** those assets have category, usage scope, title, and resolvable upload filenames
- **AND** the assets can be selected by editor asset pickers

##### Example: Existing Overview background appears in gallery

- **GIVEN** Overview uses a seed hero background image
- **WHEN** the operator opens the asset library workspace
- **THEN** the Overview hero seed image appears as a background asset
- **AND** its file resolves through the same managed asset URL pattern as uploaded assets

### Requirement: Seed asset bootstrap is idempotent and non-destructive

The system SHALL bootstrap seed assets idempotently. Repeated seed or startup runs SHALL NOT duplicate seed asset rows and SHALL NOT overwrite operator-uploaded assets or operator replacement choices.

#### Scenario: Bootstrap runs more than once

- **WHEN** seed asset bootstrap runs after the same seed assets already exist
- **THEN** the existing seed asset catalog rows are reused
- **AND** no duplicate rows are inserted
- **AND** user-uploaded assets remain unchanged

##### Example: Solar icon seed remains one catalog item

- **GIVEN** the Solar generation icon seed asset already exists in the managed asset catalog
- **WHEN** the server seed runs again
- **THEN** there is still only one catalog row for that Solar generation icon seed
- **AND** any separately uploaded replacement icon remains present
