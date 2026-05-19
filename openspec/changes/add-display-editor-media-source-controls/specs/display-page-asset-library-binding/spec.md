## MODIFIED Requirements

### Requirement: Bind display page media fields to managed asset library references

The system SHALL let display page media fields persist an explicit source contract so editor and runtime can resolve managed assets, direct sources, and seed-default fallbacks consistently. When a binding uses managed asset mode, the saved configuration SHALL store the managed asset reference. When a binding uses a non-managed mode, the saved configuration SHALL preserve that mode-specific payload without forcing a synthetic asset reference.

#### Scenario: Editor saves a managed media reference

- **WHEN** an operator selects a managed asset for an `Overview`, `Solar`, `Images`, or `Sustainability` media field
- **THEN** the saved configuration stores the binding in managed asset mode with the managed asset reference
- **AND** the runtime resolves the displayable asset from that reference

#### Scenario: Editor saves a direct source without an asset reference

- **WHEN** an operator selects direct source mode for an eligible media field and provides a valid source path or URL
- **THEN** the saved configuration stores the binding in direct source mode without requiring an asset reference
- **AND** the runtime resolves the displayable asset from the direct source payload

##### Example: Sustainability hero stores a direct image path without assetId

- **GIVEN** the `Sustainability` hero binding switches to `sourceMode=direct-src`
- **WHEN** the operator enters `/uploads/images/sustainability-hero.png` and saves the draft
- **THEN** the saved binding keeps `sourceMode=direct-src` and `src=/uploads/images/sustainability-hero.png`
- **AND** the saved binding does not require `assetId`
