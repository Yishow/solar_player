## Context

The previous tooltip change added a deterministic `Topic:` line, but the display-story payload does not include configured MQTT topic metadata. Because playback view models only receive metric keys, dependency keys, source class, units, and labels, they cannot show real topics even when `topic_mappings` contains them.

## Implementation Contract

### Source topic metadata

- `ResolvedMonitoringMetricBinding` SHALL carry optional topic metadata without requiring every metric to have a topic.
- Server display-story generation SHALL read `topic_mappings.metric_key` and `topic_mappings.topic` once per payload build and attach trimmed topics by metric key.
- Direct MQTT-backed metrics SHALL expose their metric topic when present.
- Derived metrics SHALL expose dependency topics when their dependencies have configured topics. The self-consumption ratio must expose the topics for `selfConsumptionEnergy` and `consumptionEnergy`.
- Aggregate metrics without a single topic SHALL keep missing topic behavior visible as `--`.

### Tooltip rendering

- Web view models SHALL pass the story-provided topic metadata into the existing tooltip helper.
- The tooltip helper SHALL keep deterministic `Topic:` output and display multiple dependency topics in a stable order when provided.
- Layout and visible card copy SHALL remain unchanged; the only user-facing change is tooltip content.

### Verification

- Add RED server route coverage proving `/api/display-story` includes topic metadata for direct and derived metrics.
- Add RED web view model coverage proving Overview direct KPI and Solar self-consumption tooltips include configured topics.
- Run focused server and web tests, then build.
