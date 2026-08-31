import { derivedMetricCatalogMetadata, type DerivedMetricDefinition } from "./derivedMetric.js";
import { resolvePlaybackMetricCatalog } from "./playbackMetricContract.js";
import type { MetricCatalogEntry, WidgetDataBindingPageKey } from "./widgetDataBinding.js";

/**
 * Built-in catalog entries whose semantic metric key differs from the derived
 * metric definition that now produces them.
 */
const definitionKeyOverrides: Partial<Record<WidgetDataBindingPageKey, Record<string, string>>> = {
  "factory-circuit": { totalPower: "factoryCircuit.jungliTotalPower" },
  "factory-circuit-guanyin": { totalPower: "factoryCircuit.guanyinTotalPower" }
};

function resolveDefinitionKey(pageKey: WidgetDataBindingPageKey, metricKey: string) {
  return definitionKeyOverrides[pageKey]?.[metricKey] ?? metricKey;
}

/**
 * Resolve the metric catalog a page authors and validates against, with derived
 * metric definitions overlaid onto the built-in entries.
 *
 * Both the authoring surface and the server MUST resolve their catalog through
 * this function: an authoring surface that skips the overlay offers scopes the
 * server rejects on save.
 *
 * `definitions` takes the full definition list — disabled definitions are
 * filtered here rather than by each caller. `excludedMetricKeys` carries the
 * metric keys the registry failed to compile and has no default, so a caller
 * must decide what to exclude instead of silently offering broken metrics.
 */
export function resolveEffectivePlaybackMetricCatalog(args: {
  definitions: readonly DerivedMetricDefinition[];
  excludedMetricKeys: ReadonlySet<string>;
  pageKey: WidgetDataBindingPageKey;
}): readonly MetricCatalogEntry[] {
  const definitions = args.definitions.filter(
    ({ enabled, metricKey }) => enabled && !args.excludedMetricKeys.has(metricKey)
  );
  const siteDefinitions = new Map(
    definitions
      .filter(({ outputScopePolicy }) => outputScopePolicy === "site")
      .map((definition) => [definition.metricKey, definition])
  );
  const catalog = resolvePlaybackMetricCatalog(args.pageKey).map((entry) => {
    const definition = siteDefinitions.get(resolveDefinitionKey(args.pageKey, entry.metricKey));
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
    .filter(({ managed, metricKey }) => !managed && !existing.has(metricKey))
    .map((definition): MetricCatalogEntry => ({
      ...derivedMetricCatalogMetadata(definition),
      compatibleWidgetRoles: ["numeric-kpi", "numeric-flow"]
    }));
  return [...catalog, ...custom];
}
