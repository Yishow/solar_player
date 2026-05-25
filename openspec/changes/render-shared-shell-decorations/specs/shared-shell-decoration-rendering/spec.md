## ADDED Requirements

### Requirement: Render shared shell decoration objects inside playback and management shell bands
The system SHALL render shared shell decoration objects inside the existing header and footer bands for both playback and management shells. The rendering path SHALL use the published live shell decoration contract so both shell families present the same shared objects at the same FHD coordinates.

#### Scenario: Playback and management shells render the same live header objects
- **WHEN** both shell families read the same live shell decoration contract
- **THEN** they render the same header object set inside the shared header band
- **AND** the object coordinates map to the same design-space positions in both shells

##### Example: One header line appears in the same position in both shells
- **GIVEN** the live shell decoration contract contains a `header` line object at `left=86`, `top=76`, `width=642`, `height=2`
- **WHEN** the playback shell and management shell render their headers
- **THEN** both shells show that line inside the header band
- **AND** the rendered line aligns to the same FHD position in each shell

### Requirement: Shell decoration layers preserve deterministic order without blocking shell interactions
The system SHALL render shell decoration objects in deterministic order and SHALL keep the decoration layers passive so existing shell interactions remain available. Decorative objects MAY appear above or below visual shell content according to saved z-order, but they SHALL NOT take over pointer interactions that belong to brand, status, weather, or navigation elements.

#### Scenario: Decorations render in saved order while navigation remains clickable
- **WHEN** the shell renders multiple footer decoration objects together with the footer navigation
- **THEN** the objects follow their saved z-order
- **AND** the footer navigation remains interactive

##### Example: Footer ornament sits behind links while a highlight line sits above the background
- **GIVEN** the live footer object list contains a low-z ornament image and a higher-z line object
- **WHEN** the footer renders those objects with the navigation links
- **THEN** the ornament appears behind the links and the line appears above the footer background
- **AND** the links still respond to pointer interaction

### Requirement: Shell decoration rendering falls back cleanly when live data or assets are unavailable
The system SHALL keep the existing shell chrome visible when the live shell decoration contract is empty, unavailable, or partially unresolved. A missing object asset SHALL only affect that object and SHALL NOT cause the whole header or footer render path to fail.

#### Scenario: Missing asset skips one object without breaking the shell
- **WHEN** a live shell decoration object references an asset that cannot be resolved
- **THEN** the runtime skips that object
- **AND** the rest of the shell chrome and remaining decoration objects continue rendering

##### Example: Missing footer ornament does not remove the footer navigation
- **GIVEN** the live footer object list contains one missing ornament image and one valid line object
- **WHEN** the footer renders
- **THEN** the missing ornament is omitted
- **AND** the line object and footer navigation still render normally
