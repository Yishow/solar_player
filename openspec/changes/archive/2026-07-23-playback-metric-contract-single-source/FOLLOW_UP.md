# Follow-up (out of scope for this change)

This change only consolidates Overview + Solar playback metric contract into `@solar-display/shared`.

## Explicitly deferred

1. **Factory Circuit** — dual metric key tracks (legacy Jungli vs Guanyin namespaced keys) and slot runtime subscription alignment.
2. **Sustainability** — story-primary path metric contract consolidation with household / aggregate provenance.
3. **Ops diagnostics UI** — Device Status / Display Ops “field → metricKey → topic/derived” inspector surface.

Do not implement the above inside `playback-metric-contract-single-source`.
