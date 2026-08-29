## ADDED Requirements

### Requirement: Metric-backed preview state is keyed by page instance and Preview Context

When live display previews include resolved metric data, preview identity SHALL distinguish the selected page instance and trusted Preview Context. Cached or shared preview state MUST NOT treat two different data contexts as equivalent merely because they render the same page instance or template.

#### Scenario: One page instance is previewed for CL and KN
- **WHEN** the same Overview instance is previewed in CL context and KN context
- **THEN** the preview catalog keeps distinct resolved data states for the two contexts
- **AND** the KN preview does not reuse CL values, freshness, or provenance

#### Scenario: Two page instances share one Preview Context
- **WHEN** `overview` and `overview-2` are both previewed for the same CL context but have different published widget bindings
- **THEN** each instance resolves and caches its own effective binding plan
- **AND** changing one instance's binding does not mutate the other instance's preview data state
