## ADDED Requirements

### Requirement: Store page freeform objects inside each display page draft and live config
The system SHALL store page freeform objects inside each display page configuration envelope so the objects publish together with the rest of that page. Freeform objects SHALL remain separate from the existing region, media, and card-rail groups so operators can add decoration objects without redefining the page's seed-backed content model.

#### Scenario: Publishing a page also publishes its freeform object list
- **WHEN** the operator publishes a display page that contains freeform objects
- **THEN** the page's live config includes the same freeform object list that was reviewed in draft
- **AND** the page does not require a second publish step for those objects

##### Example: Overview draft publishes one line and one asset image object
- **GIVEN** the Overview draft contains one `line` object and one `asset-image` object
- **WHEN** the operator publishes the Overview draft
- **THEN** the Overview live config stores those two objects together with the rest of the page config
- **AND** playback reads the same object list from the live page config

### Requirement: Display pages render freeform objects in a dedicated content layer
The system SHALL render page freeform objects in a dedicated content-surface layer for playback pages. The first release SHALL support `line`, `asset-image`, and `icon-asset` objects and SHALL render them without rewriting the existing hero, card, or media component ownership.

#### Scenario: Playback renders freeform object types above the page background
- **WHEN** a playback page contains valid freeform objects in its live config
- **THEN** the page renders those objects in the shared content layer
- **AND** the existing page content remains visible beneath or above the objects according to saved z-order

##### Example: Sustainability page renders a line and icon asset object
- **GIVEN** the Sustainability live config contains one `line` object and one `icon-asset` object
- **WHEN** the Sustainability playback route renders
- **THEN** both objects appear inside the page content surface
- **AND** the rest of the Sustainability hero and cards still render normally

### Requirement: Page freeform object publish validation blocks invalid bounds and sources
The system SHALL validate page freeform objects before publish. Validation SHALL reject objects that leave the FHD content bounds, use unsupported object types, or provide malformed source payloads for asset-backed object types.

#### Scenario: Publish rejects an object outside the content surface
- **WHEN** a page freeform object extends outside the allowed content surface
- **THEN** the publish request is rejected
- **AND** the validation findings identify the offending object

##### Example: Asset image object overflows the right edge
- **GIVEN** the page content surface width is `1920`
- **AND** an `asset-image` object stores `left=1820` and `width=180`
- **WHEN** the operator tries to publish the page draft
- **THEN** the publish request is rejected because the object exceeds the content width
- **AND** the validation finding names that object's `id`

#### Scenario: Publish rejects malformed icon asset payloads
- **WHEN** a page freeform object of type `icon-asset` omits the required icon asset reference
- **THEN** the publish request is rejected
- **AND** the validation finding describes the malformed source payload instead of allowing degraded live output

##### Example: Icon object omits its asset reference
- **GIVEN** a page freeform object of type `icon-asset`
- **AND** the object omits the required icon asset identifier
- **WHEN** the operator tries to publish the page draft
- **THEN** the publish request is rejected
- **AND** the validation finding identifies the incomplete icon source payload
