## ADDED Requirements

### Requirement: Region geometry supports a proportional resize mode

The region geometry schema SHALL support a `resizeMode` value of `"proportional"`. When a region declares `resizeMode` `"proportional"`, canvas resize interactions SHALL maintain the region's starting aspect ratio: a change driven along one axis SHALL derive the other axis so that width divided by height equals the region's aspect ratio at the start of the interaction. Minimum and maximum size constraints SHALL still apply; when a constraint is reached, the resize SHALL clamp on the constrained axis and derive the other axis to preserve the ratio. A region that does not declare `resizeMode` `"proportional"` SHALL retain its existing resize behavior unchanged.

#### Scenario: Proportional resize preserves aspect ratio

- **WHEN** the operator resizes a region whose `resizeMode` is `"proportional"`
- **THEN** the resulting width-to-height ratio equals the region's aspect ratio at the start of the interaction

#### Scenario: Non-proportional region keeps existing behavior

- **WHEN** the operator resizes a region whose `resizeMode` is not `"proportional"`
- **THEN** the resize behaves as it did before this capability, with no aspect-ratio locking

##### Example: Overview KPI card resized proportionally

- **GIVEN** an Overview KPI region with `resizeMode` `"proportional"` and a starting frame of width 352 and height 220
- **WHEN** the operator drags a corner handle to increase the width
- **THEN** the height increases so the frame keeps the original 352-to-220 aspect ratio within a one-pixel rounding tolerance
