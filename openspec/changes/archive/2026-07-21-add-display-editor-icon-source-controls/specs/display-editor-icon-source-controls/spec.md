## ADDED Requirements

### Requirement: Editor SHALL expose explicit icon source modes for eligible icon regions

The system SHALL let the display editor expose explicit icon source modes for eligible icon regions on `Overview`, `Solar`, `FactoryCircuit`, `Images`, and `Sustainability`. The available modes SHALL cover the existing source families used by the product.

#### Scenario: Operator selects an icon source mode

- **WHEN** the operator selects an eligible icon-bearing region in the editor
- **THEN** the inspector shows an icon source mode selector
- **AND** the editor reveals only the fields required by the selected mode

##### Example: Factory Circuit node switches from page-local icon key to ReferenceGlyph

- **GIVEN** a `FactoryCircuit` node currently uses a page-local icon registry key
- **WHEN** the operator changes the source mode to `reference-glyph`
- **THEN** the editor stores the new mode and its glyph payload
- **AND** the preview updates without requiring a code change

### Requirement: Page-local icon registries SHALL remain addressable through the shared icon resolver

The system SHALL keep page-local icon registries addressable through a shared icon resolver so `Sustainability` and `FactoryCircuit` can continue using their page-specific icon sets while sharing one preview/runtime resolution contract.

#### Scenario: Sustainability icon resolves through the shared resolver

- **WHEN** a `Sustainability` stat card stores a page-local icon registry payload
- **THEN** the shared icon resolver resolves that payload into the expected icon node
- **AND** the preview and playback routes render the same icon output

##### Example: ESG document icon uses the Sustainability registry

- **GIVEN** a `Sustainability` stat card stores `mode=page-icon-key`, `registry=sustainability`, and `iconKey=esg-doc`
- **WHEN** the card renders in preview and playback
- **THEN** both routes resolve the same `esg-doc` SVG from the Sustainability icon registry

### Requirement: Invalid icon source payloads SHALL fall back to the seed icon source

The system SHALL fall back to the seed icon source when an icon payload is incomplete or invalid, and the editor SHALL surface a validation issue instead of letting preview or playback fail silently.

#### Scenario: Invalid icon source falls back safely

- **WHEN** an icon source payload references a missing asset or unknown registry key
- **THEN** the preview and playback routes render the region's seed icon source
- **AND** the inspector surfaces a validation issue for the invalid payload

##### Example: Solar KPI asset image fallback preserves IMG output

- **GIVEN** a `Solar` KPI card uses `asset-image` mode in the seed configuration
- **WHEN** the operator saves an invalid replacement image payload
- **THEN** the card falls back to the seed icon source
- **AND** the rendered icon output remains an `IMG` element instead of switching to a generic SVG
