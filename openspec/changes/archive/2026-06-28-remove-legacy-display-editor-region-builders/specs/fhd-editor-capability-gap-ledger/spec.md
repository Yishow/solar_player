## MODIFIED Requirements

### Requirement: Ledger SHALL use current repo sources and avoid deprecated workflow inputs

The ledger SHALL be grounded in current repo sources and SHALL avoid deprecated prototype or reference-match workflow inputs.

#### Scenario: Active editor source is resolved from page region schemas

- **GIVEN** the contributor audits editor coverage
- **WHEN** they choose code anchors for the ledger
- **THEN** they SHALL use `DisplayPagesEditor`, `pageRegionSchemasByTemplate`, and each page's `*DisplayPageEditorRegions` as the active editor-region source
- **AND** the ledger and its governance test SHALL NOT require any `build*Regions` helper text, because those unused local helpers have been removed from `runtime*.tsx`

#### Scenario: Ledger does not depend on reference-match

- **GIVEN** the ledger is created or updated
- **WHEN** validation or review checks the ledger
- **THEN** the ledger SHALL NOT contain `docs/reference-match/`
- **AND** FHD reference paths SHALL point to `docs/reference/FHD/`
