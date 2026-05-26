## MODIFIED Requirements

### Requirement: Bind display page media fields to managed asset library references

The system SHALL let display page media fields and other asset-backed display payloads reference managed assets so editor and runtime can resolve shared asset metadata, existence, usage scope, and delete safety consistently. This SHALL include display page media fields, shared shell decoration asset objects, and page freeform asset-backed objects.

#### Scenario: Editor saves a managed media or object reference

- **WHEN** an operator selects a managed asset for an `Overview`, `Solar`, `Images`, or `Sustainability` media field, a shared shell decoration asset object, or a page freeform asset-backed object
- **THEN** the saved configuration stores the managed asset reference
- **AND** the runtime resolves the displayable asset from that reference using the shared asset catalog contract

##### Example: Footer ornament and Overview hero share managed asset references

- **GIVEN** the asset catalog contains a managed ornament asset and a managed hero image asset
- **WHEN** an operator selects the ornament asset for a shared footer decoration object and the hero image asset for the `Overview` hero media field
- **THEN** both saved payloads store managed asset references instead of raw path-only literals
- **AND** runtime consumers resolve both assets through the shared catalog contract

### Requirement: Protect managed asset references from silent breakage

The system SHALL report when display page media, shared shell decorations, or page freeform objects reference an asset that no longer exists or can no longer be resolved.

#### Scenario: Referenced asset is missing

- **WHEN** a display page configuration, shared shell decoration config, or page freeform object list references a removed or unavailable asset
- **THEN** the management surfaces receive a missing-asset finding
- **AND** the runtime uses its fallback behavior instead of crashing

##### Example: Footer ornament binding points to a deleted asset

- **GIVEN** a shared footer decoration asset object references asset `asset-footer-ornament-1`
- **WHEN** that asset is deleted or cannot be resolved by the runtime
- **THEN** management surfaces report the missing binding
- **AND** the shell falls back without throwing a runtime error
