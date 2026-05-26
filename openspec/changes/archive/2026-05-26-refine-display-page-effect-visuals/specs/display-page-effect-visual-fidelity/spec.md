## ADDED Requirements

### Requirement: Render visible localized mist effects consistently

The system SHALL render localized mist or edge blur effects as visible media-layer treatments in both Display Pages Editor previews and playback runtime surfaces. Mist rendering SHALL preserve the primary media subject while softening the configured edge or region, and SHALL NOT rely only on blurring the entire image.

#### Scenario: Operator previews a page with mist enabled

- **WHEN** a display page media item has mist or edge blur enabled
- **THEN** the editor preview renders a visible localized mist treatment on the configured edge or region
- **AND** the rest of the media remains visible enough for placement editing
- **AND** the playback runtime uses the same rendering semantics

##### Example: Overview hero image shows left-edge mist

- **GIVEN** the Overview hero media uses the default visible mist treatment
- **WHEN** the operator opens `/display-pages/editor?page=overview`
- **THEN** the hero image shows a soft mist transition along the configured edge
- **AND** the effect is also visible on the live Overview playback route

### Requirement: Keep media effects bounded to their owning media layer

The system SHALL keep mist, blur, opacity, and edge fade effects bounded to the media layer that owns the configured effect. These effects SHALL NOT obscure shell header/footer chrome or unrelated display page content.

#### Scenario: Media effect is enabled near shell chrome

- **WHEN** a media item with mist or blur appears near the header or footer
- **THEN** the effect remains clipped to the media effect container
- **AND** shell chrome remains readable and interactive

##### Example: Footer navigation remains readable

- **GIVEN** a page background image uses bottom-edge mist
- **WHEN** the playback shell renders the footer navigation
- **THEN** the footer labels remain readable
- **AND** the mist does not create a new overlay above the footer
