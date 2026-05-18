## ADDED Requirements

### Requirement: Run layout safety guards before publish

The system SHALL validate display page draft configuration before publish and SHALL block publishing when blocking layout or content errors are present.

#### Scenario: Blocking validation prevents publish

- **GIVEN** a draft configuration places a required region outside the FHD canvas or omits a required field
- **WHEN** an operator tries to publish the draft
- **THEN** the publish request is rejected
- **AND** the response includes the blocking validation findings

### Requirement: Surface layout safety guards results in the editor workflow

The display page editor SHALL show layout safety guards results for the selected draft so operators can correct issues before retrying publish.

#### Scenario: Editor shows validation feedback

- **WHEN** validation finds overlapping KPI cards or an invalid geometry value in a draft
- **THEN** the editor shows the findings with region-level context
- **AND** the draft remains editable until the issues are resolved

##### Example: Solar publish is blocked by overlapping KPI cards

- **GIVEN** a `Solar` draft moves `generation` and `efficiency` KPI cards to the same rectangle
- **WHEN** validation runs before publish
- **THEN** the editor shows both region ids in the findings list
- **AND** the operator can continue editing the draft without changing the current live page
