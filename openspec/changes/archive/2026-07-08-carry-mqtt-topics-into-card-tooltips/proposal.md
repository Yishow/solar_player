## Problem

Playback monitoring card tooltips already expose a `Topic:` line, but runtime/story data does not carry configured MQTT topic metadata. As a result, topic-backed cards display `Topic: --` even when `topic_mappings` has an enabled configured topic.

## Root Cause

`displayStoryService` reads only topic display names from `topic_mappings`, and shared `ResolvedMonitoringMetricBinding` has no field for the configured source topic. The web view models therefore cannot pass a topic into `buildMonitoringSourceTooltip`.

## Proposed Solution

Carry source topic metadata through the existing monitoring story binding shape. Server display-story builders will read configured topics by metric key and attach the relevant topic to direct MQTT-backed metrics and dependency-backed derived metrics. Web view models will pass the received topic into the existing tooltip helper.

## Non-Goals

- Do not add arbitrary topic input to playback pages.
- Do not change card layout, visible copy, or tooltip rendering mechanism.
- Do not change MQTT publish behavior.

## Success Criteria

- `/api/display-story` includes configured MQTT topic metadata for topic-backed monitoring metrics.
- Solar self-consumption tooltip shows the configured topics for `selfConsumptionEnergy` and `consumptionEnergy` instead of only `--`.
- Overview direct MQTT card tooltip shows its configured topic.
- Missing or non-topic aggregate metrics still use the clear `--` marker.

## Impact

- Affected code:
  - Modified: packages/shared/src/displayStory.ts
  - Modified: apps/server/src/services/displayStoryService.ts
  - Modified: apps/server/src/routes/display-story.test.ts
  - Modified: apps/web/src/pages/shared/monitoringSourceTooltip.ts
  - Modified: apps/web/src/pages/Overview/viewModel.ts
  - Modified: apps/web/src/pages/Overview/viewModel.test.ts
  - Modified: apps/web/src/pages/Solar/viewModel.ts
  - Modified: apps/web/src/pages/Solar/viewModel.test.ts
  - Modified: apps/web/src/pages/FactoryCircuit/viewModel.ts
  - Modified: apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - Modified: openspec/specs/display-monitoring-story-model/spec.md
