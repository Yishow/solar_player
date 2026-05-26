## ADDED Requirements

### Requirement: Model display-page media effects as typed composable layers

The system SHALL model display-page media effects as typed composable layers rather than a fixed set of named booleans and special-case fields. The canonical resolved form SHALL represent multiple effect layers on the same media source and SHALL support multiple layers targeting the same visual zone.

#### Scenario: Resolver normalizes two layers for the same zone

- **WHEN** the input effect payload expresses two supported effects for the same zone
- **THEN** the normalized media effect result preserves both layers
- **AND** the layers remain distinct rather than being collapsed into one special-case field

##### Example: Same-zone blur and mist remain separate layers

- **GIVEN** a media source has top-zone mist and top-zone blur
- **WHEN** the shared resolver normalizes the payload
- **THEN** the resolved form contains two effect layers for the top zone
- **AND** downstream consumers can render them in order

### Requirement: Normalize zone vocabulary and support typing in shared code

The system SHALL provide shared zone vocabulary and support typing for media effects. Supported zones SHALL include top, bottom, left, right, dual-edge combinations, all-edges, and full-frame scopes as applicable.

#### Scenario: Page config declares supported zones

- **WHEN** a page media surface declares its media effect support
- **THEN** it can enumerate supported effect kinds and supported zones through shared typing
- **AND** downstream editor or renderer code does not need page-local string guessing

##### Example: Overview hero declares edge and frame support from shared types

- **GIVEN** the Overview hero media surface
- **WHEN** its effect support is defined
- **THEN** the configuration uses shared zone and effect typing
- **AND** other surfaces can declare different support without inventing incompatible shapes

### Requirement: Keep legacy effect data readable while canonical writing moves forward

The system SHALL preserve compatibility for existing blur, fade, and opacity data while the canonical media effect model moves to typed layers. Legacy data SHALL remain readable and SHALL normalize into the canonical resolved form.

#### Scenario: Existing seeded page uses legacy edge fade data

- **WHEN** a seeded page still stores legacy edge-fade fields
- **THEN** the shared resolver reads that data successfully
- **AND** the canonical resolved result reflects the equivalent effect layer semantics

##### Example: Existing Overview hero seed still resolves

- **GIVEN** an existing Overview hero seed with legacy fade fields
- **WHEN** the system loads that seed
- **THEN** the media effect resolver still produces valid normalized effect layers
- **AND** the page does not lose its prior visual intent
