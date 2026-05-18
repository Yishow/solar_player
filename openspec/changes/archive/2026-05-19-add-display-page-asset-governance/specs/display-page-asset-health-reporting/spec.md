## ADDED Requirements

### Requirement: Report asset health for display page references

The system SHALL compute asset health for display page references and SHALL expose that health to management surfaces.

#### Scenario: Management surface reads asset health

- **WHEN** a management route requests asset health for display operations
- **THEN** the response includes health status, affected pages, and the reason for any unhealthy reference
- **AND** healthy references remain distinguishable from missing or incompatible ones

##### Example: Asset health call reports one missing hero asset

- **GIVEN** `overview` still references asset `hero-12` and that asset file no longer exists
- **WHEN** the management surface requests display asset health
- **THEN** the response marks that reference unhealthy
- **AND** it identifies `overview` and the missing-file reason in the findings

### Requirement: Show asset health reporting where operators edit or manage media

The system SHALL surface asset health reporting in editor or image-management workflows so operators can act before unhealthy references reach production.

#### Scenario: Operator sees unhealthy media reference while editing

- **WHEN** an operator opens a display page or image-management surface that includes an unhealthy asset reference
- **THEN** the UI shows that finding with affected-page context
- **AND** the operator can identify which reference needs correction

##### Example: Images editor warns about an unhealthy stage asset

- **GIVEN** the `Images` main stage points to an asset whose dimensions no longer match the expected source
- **WHEN** the operator opens the related editor or media-management surface
- **THEN** the UI highlights that asset as unhealthy
- **AND** it shows the affected `images` reference so the operator knows what to replace
