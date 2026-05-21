## MODIFIED Requirements

### Requirement: Run layout safety guards before publish

The system SHALL validate display page draft configuration before publish and SHALL block publishing when blocking layout or content errors are present. When a page defines a card rail, the validation SHALL also check each visible rail card's frame and template-required content.

#### Scenario: Blocking validation prevents publish

- **GIVEN** a draft configuration places a required region outside the FHD canvas or omits a required field
- **WHEN** an operator tries to publish the draft
- **THEN** the publish request is rejected
- **AND** the response includes the blocking validation findings

#### Scenario: Rail card frame exceeds the rail container

- **GIVEN** a draft page contains a visible rail card whose frame extends outside the saved card rail container
- **WHEN** the operator tries to publish the draft
- **THEN** the publish request is rejected
- **AND** the validation findings identify the offending rail card instead of only the parent rail region

##### Example: Visible rail card overflows the right edge

- **GIVEN** a card rail container with `left=68`, `width=470`
- **AND** a visible card inside that rail stores `left=420`, `width=140`
- **WHEN** the operator publishes the draft
- **THEN** the publish is blocked because the card extends beyond the rail width
- **AND** the finding names that rail card as out of bounds

#### Scenario: Visible rail card is missing template-required content

- **GIVEN** a visible rail card uses a known template
- **WHEN** the saved payload omits a field required by that template contract
- **THEN** the publish request is rejected
- **AND** the validation findings identify the missing template content rather than allowing an incomplete live card
