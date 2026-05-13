## ADDED Requirements

### Requirement: Align images and sustainability as the dedicated media-heavy playback batch

The implementation SHALL align `/images` and `/sustainability` as the dedicated media-heavy playback batch.

#### Scenario: The media-heavy playback batch starts

- **WHEN** this playback batch begins
- **THEN** it is limited to `/images` and `/sustainability`
- **AND** it treats media slot and storytelling composition as the primary alignment target

##### Example:

- **GIVEN** the earlier playback batches already handled KPI and flow pages
- **WHEN** this change is applied
- **THEN** `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` maps to `/images` and `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html` maps to `/sustainability`
- **AND** no other playback route is included in the same change

### Requirement: Preserve media and sustainability fallback presentation

The implementation SHALL preserve placeholder and fallback presentation for `/images` and `/sustainability`.

#### Scenario: Runtime assets or summaries are unavailable

- **WHEN** `/images` has no runtime asset or `/sustainability` lacks live summary data
- **THEN** the page uses a deliberate placeholder or fallback presentation
- **AND** the layout remains structurally intact

##### Example:

- **GIVEN** `/images` does not have a slideshow asset and `/sustainability` only has mock summary data
- **WHEN** the routes render
- **THEN** both routes still show complete prototype-aligned sections
- **AND** neither route invents a new backend dependency just to fill a slot
