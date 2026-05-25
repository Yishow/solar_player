## MODIFIED Requirements

### Requirement: Provide per-binding media placement controls for display pages

The system SHALL provide media placement controls per display-page media binding, including focal point, fit behavior, alignment settings, and any supported effect settings that belong to that same hero or media surface.

#### Scenario: Operator adjusts hero placement

- **WHEN** an operator changes the placement controls for a hero or stage image
- **THEN** the editor preview reflects the new crop and alignment
- **AND** the production playback route uses the same placement settings after publish

##### Example: Overview hero image shifts focus to the left

- **GIVEN** the `Overview` hero image is bound to a managed asset
- **WHEN** the operator changes `focusX` from `0.5` to `0.3` with `cover` fit mode
- **THEN** the editor preview shows more content from the left side of the asset
- **AND** publishing preserves that same crop in production playback

#### Scenario: Operator combines placement and supported effect controls on one surface

- **WHEN** an operator adjusts both the placement settings and supported effect controls for the same hero or media surface
- **THEN** the editor preview applies those settings together
- **AND** the production playback route resolves the same combined placement and effect result after publish

##### Example: Overview hero keeps left focus with a softer left-edge fade

- **GIVEN** the `Overview` hero image is bound to a managed asset
- **WHEN** the operator sets `focusX=0.3` and applies a supported left-edge fade adjustment for that hero surface
- **THEN** the editor preview shows the asset focused to the left with the updated fade treatment
- **AND** production playback resolves the same crop and fade combination
