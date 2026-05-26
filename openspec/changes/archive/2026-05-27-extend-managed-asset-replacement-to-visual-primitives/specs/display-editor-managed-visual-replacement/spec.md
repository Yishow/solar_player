## ADDED Requirements

### Requirement: Display editor can replace existing visual primitives with managed assets

The system SHALL let operators replace existing display visual primitives with managed assets from the asset library. Replacement coverage SHALL include page backgrounds or hero media, main-stage images, card icons, flow or node icons, placeholder icons, and replaceable leaf or ornament visuals.

#### Scenario: Operator replaces a card icon from the asset library

- **WHEN** the operator selects a card icon region in Display Pages Editor
- **THEN** the inspector provides a managed asset replacement option
- **AND** choosing an asset updates the draft config for that icon source
- **AND** the preview renders the selected asset instead of the built-in icon fallback

##### Example: Solar KPI icon is replaced

- **GIVEN** the Solar generation KPI card uses the seed sun/generation icon
- **WHEN** the operator chooses a managed icon asset for that KPI card
- **THEN** the Solar editor preview renders the managed icon asset
- **AND** publishing the page makes the replacement visible on the Solar playback route

### Requirement: Managed visual replacements participate in asset governance

The system SHALL include managed visual replacements in asset health checks, usage reporting, and destructive delete guards. A managed asset referenced by a page icon, node icon, ornament, or shell ornament SHALL NOT be silently deleted.

#### Scenario: Operator tries to delete an asset used by a leaf ornament

- **WHEN** an asset is referenced by a display page leaf ornament replacement
- **AND** the operator attempts to delete that asset from the asset library
- **THEN** the delete action is blocked
- **AND** the usage panel identifies the page and ornament binding that depends on the asset

##### Example: Shell ornament replacement blocks deletion

- **GIVEN** a Shared Shell Decoration ornament uses managed asset `42`
- **WHEN** the operator selects asset `42` in the asset library
- **THEN** the usage panel lists the shell ornament binding
- **AND** deleting asset `42` is blocked until the shell ornament no longer references it

### Requirement: Managed visual replacements fall back safely

The system SHALL fall back to the configured seed source, glyph, registry icon, or built-in ornament when a managed visual replacement cannot resolve. The fallback SHALL preserve page readability and SHALL surface an asset health finding for the unresolved managed reference.

#### Scenario: Managed card icon asset is missing

- **WHEN** a page card icon references a managed asset that no longer exists
- **THEN** the page renders the seed icon fallback
- **AND** asset health reports the missing managed icon reference

##### Example: Factory node icon remains readable

- **GIVEN** a Factory node icon references a deleted managed asset
- **WHEN** the Factory Circuit page renders
- **THEN** the node uses its seed registry icon fallback
- **AND** the asset health panel reports the deleted managed asset reference
