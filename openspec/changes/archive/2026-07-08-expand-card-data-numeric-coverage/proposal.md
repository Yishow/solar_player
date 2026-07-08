## Summary

Extend the MQTT Card Data Management tab so it covers all numeric playback cards requested for operator adjustment, and fix the vertical input-prefix rendering inside that tab.

## Motivation

The current Card Data Management tab covers Overview metrics, Solar KPIs, Factory Circuit KPIs, and Sustainability household-equivalent cards. Operators still cannot see or adjust Sustainability period numeric cards and Factory Circuit engineering slot power values from the same workspace. The override/test-value controls also render their input prefix text vertically in narrow rows, making the management UI look broken.

## Proposed Solution

- Add card diagnostics rows for Sustainability period big-number/highlight values that are numeric display cards.
- Add card diagnostics rows for Factory Circuit engineering slot live power values, including the slot label, metric key, source topic, status, latest value, and display-only override support.
- Fix Card Data Management input-prefix CSS so labels such as `展示覆寫值` and `測試數值` remain horizontal.

## Non-Goals

- Do not include Images playlist, captions, slideshow timing, static text, weather/header values, editor layout/style, or non-card playback data.
- Do not change MQTT ingestion, topic parsing, display editor authoring, or playback page visual layout.
- Do not add text override support in this change; non-numeric rows must not be expanded beyond the requested numeric card scope.

## Impact

- Affected specs: display-card-data-management
- Affected code:
  - Modified: apps/server/src/services/displayCardDataService.ts
  - Modified: apps/server/src/routes/display-card-data.test.ts
  - Modified: apps/web/src/pages/MqttSettings/mqttSettings.css
  - Modified: apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - Modified: openspec/specs/display-card-data-management/spec.md
