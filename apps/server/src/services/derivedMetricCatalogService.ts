import {
  resolveEffectivePlaybackMetricCatalog,
  type MetricCatalogEntry,
  type WidgetDataBindingPageKey
} from "@solar-display/shared";
import {
  listDerivedMetricDefinitions,
  readDerivedMetricRegistryDiagnostics
} from "./derivedMetricRegistryService.js";

export function resolveServerPlaybackMetricCatalog(
  pageKey: WidgetDataBindingPageKey
): readonly MetricCatalogEntry[] {
  return resolveEffectivePlaybackMetricCatalog({
    definitions: listDerivedMetricDefinitions(),
    excludedMetricKeys: new Set(
      readDerivedMetricRegistryDiagnostics().map(({ metricKey }) => metricKey)
    ),
    pageKey
  });
}
