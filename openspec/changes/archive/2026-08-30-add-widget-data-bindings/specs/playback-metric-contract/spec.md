## MODIFIED Requirements

### Requirement: Shared package owns Overview and Solar playback metric contract

The system SHALL define a single shared playback metric contract for the `overview` and `solar` pages that is the authoritative source for (1) metric vocabulary and default bindings used to normalize legacy pages, (2) gate/dependency requirements used by readiness and freshness, and (3) display `sourceClass` metadata for registered metric keys. For a page that has explicit saved widget data bindings, those bindings SHALL be authoritative for which registered metric each widget actually displays, and runtime subscription keys SHALL be derived from the effective bindings plus their registered dependencies rather than from a parallel page-local metric-key list. Page modules and server story builders SHALL consume the shared contract and binding resolver instead of maintaining their own authoritative lists.

#### Scenario: Contract exposes three layers for Overview

- **WHEN** a caller resolves the playback metric contract for page key `overview`
- **THEN** the contract includes gate requirements drawn from the shared display metric requirements for `overview`
- **AND** it includes default metric bindings suitable for normalizing a legacy Overview configuration
- **AND** it includes display sourceClass metadata for registered Overview metric keys
- **AND** an explicit saved widget binding can select a different compatible registered metric without creating a page-local static contract

#### Scenario: Contract exposes three layers for Solar

- **WHEN** a caller resolves the playback metric contract for page key `solar`
- **THEN** the contract includes gate requirements drawn from the shared display metric requirements for `solar`
- **AND** it includes default metric bindings suitable for normalizing a legacy Solar configuration
- **AND** it includes display sourceClass metadata for registered Solar metric keys

##### Example: Solar effective subscription follows the saved binding

- **GIVEN** Solar registers `selfConsumptionRatio` as a derived metric with dependency keys
- **AND** a saved Solar widget binding selects `selfConsumptionRatio`
- **WHEN** runtime subscription requirements are resolved for that page
- **THEN** the effective subscription includes the live dependency keys required by `selfConsumptionRatio`
- **AND** display sourceClass for `selfConsumptionRatio` remains `derived-metric`
- **AND** a different compatible saved widget binding would produce its own effective subscription requirements without editing a page-local key array
