## ADDED Requirements

### Requirement: Bind display page media fields to managed asset library references

The system SHALL let display page media fields reference managed assets so editor and runtime can resolve shared asset metadata, existence, and usage consistently.

#### Scenario: Editor saves a managed media reference

- **WHEN** an operator selects a managed asset for an `Overview`, `Solar`, `Images`, or `Sustainability` media field
- **THEN** the saved configuration stores the managed asset reference
- **AND** the runtime resolves the displayable asset from that reference

### Requirement: Protect managed asset references from silent breakage

The system SHALL report when a display page references an asset that no longer exists or can no longer be resolved.

#### Scenario: Referenced asset is missing

- **WHEN** a display page configuration references a removed or unavailable asset
- **THEN** the management surfaces receive a missing-asset finding
- **AND** the runtime uses its fallback behavior instead of crashing

##### Example: Solar hero binding points to a deleted asset

- **GIVEN** the `Solar` hero binding references asset `asset-solar-hero-2`
- **WHEN** that asset is deleted or cannot be resolved by the runtime
- **THEN** management surfaces report the missing binding
- **AND** the `Solar` page falls back without throwing a runtime error
