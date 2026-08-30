import {
  derivedMetricCatalogMetadata,
  resolvePlaybackMetricCatalog,
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
  const excluded = new Set(readDerivedMetricRegistryDiagnostics().map(({ metricKey }) => metricKey));
  const definitions = listDerivedMetricDefinitions().filter(({ enabled, metricKey }) => enabled && !excluded.has(metricKey));
  const siteDefinitions = new Map(
    definitions.filter(({ outputScopePolicy }) => outputScopePolicy === "site")
      .map((definition) => [definition.metricKey, definition])
  );
  const catalog = resolvePlaybackMetricCatalog(pageKey).map((entry) => {
    const definitionKey = entry.metricKey === "totalPower"
      ? pageKey === "factory-circuit"
        ? "factoryCircuit.jungliTotalPower"
        : pageKey === "factory-circuit-guanyin"
          ? "factoryCircuit.guanyinTotalPower"
          : entry.metricKey
      : entry.metricKey;
    const definition = siteDefinitions.get(definitionKey);
    if (!definition) return entry;
    return {
      ...entry,
      ...derivedMetricCatalogMetadata(definition),
      label: entry.label,
      metricKey: entry.metricKey
    };
  });
  const existing = new Set(catalog.map(({ metricKey }) => metricKey));
  const custom = definitions
    .filter(({ enabled, managed, metricKey }) => enabled && !managed && !existing.has(metricKey))
    .map((definition): MetricCatalogEntry => ({
      ...derivedMetricCatalogMetadata(definition),
      compatibleWidgetRoles: ["numeric-kpi", "numeric-flow"],
    }));
  return [...catalog, ...custom];
}
