import type Database from "better-sqlite3";
import {
  displayMetricRequirements,
  normalizeMetricBoundPageConfig,
  resolvePlaybackDisplayMetricBindings,
  resolveWidgetDataBindingPageKey,
  type MetricDataBindingScope,
  type WidgetDataBindingPageKey
} from "@solar-display/shared";

export const metricUsageScopes = ["cl", "kn", "global", "all"] as const;
export type MetricUsageScope = (typeof metricUsageScopes)[number];
export type MetricUsageConsumerType = "widget" | "story" | "readiness";

export type MetricUsageRow = {
  configuredBindingScope: MetricDataBindingScope | null;
  configuredScope: MetricDataBindingScope | null;
  consumerId: string;
  consumerType: MetricUsageConsumerType;
  inherited: boolean;
  itemId: string | null;
  labelEn: string | null;
  labelZh: string | null;
  metricKey: string;
  pageId: string;
  pageInstanceId: number | null;
  pageKey: string;
  pageLabelEn: string | null;
  pageLabelZh: string | null;
  scopeLabel: string;
  templateKey: string;
};

type LivePageRow = {
  config_json: string;
  id: number;
  label_en: string | null;
  label_zh: string | null;
  page_key: string;
  template_key: string;
};

type UnknownRecord = Record<string, unknown>;

const widgetBindingPageKeys: readonly WidgetDataBindingPageKey[] = [
  "overview",
  "solar",
  "factory-circuit",
  "factory-circuit-guanyin"
];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readSafeFormat(value: unknown): UnknownRecord | undefined {
  if (!isRecord(value)) return undefined;

  const format: UnknownRecord = {};
  if (
    Number.isInteger(value.precision)
    && (value.precision as number) >= 0
    && (value.precision as number) <= 3
  ) {
    format.precision = value.precision;
  }
  if (value.unitDisplay === "auto" || value.unitDisplay === "hide") {
    format.unitDisplay = value.unitDisplay;
  }
  return Object.keys(format).length > 0 ? format : undefined;
}

function readSafeBinding(value: unknown, itemId: string): UnknownRecord | null {
  if (!isRecord(value) || !isRecord(value.dataBinding)) {
    return null;
  }

  const binding = value.dataBinding;
  const safeBinding: UnknownRecord = {
    metricKey: binding.metricKey,
    scope: binding.scope,
    sourceType: binding.sourceType
  };
  const format = readSafeFormat(binding.format);
  if (format) safeBinding.format = format;

  return { dataBinding: safeBinding, itemId };
}

/**
 * Read only the published binding shape needed for Usage. In particular, do
 * not pass arbitrary persisted regions through to the normalization helper.
 */
function parseLiveBindingRegions(configJson: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  const regions = "regions" in parsed
    ? (isRecord(parsed.regions) ? parsed.regions : null)
    : parsed;
  if (!regions) return null;

  if (!("dataBindings" in regions)) return {};
  if (!isRecord(regions.dataBindings)) return null;

  const dataBindings: UnknownRecord = {};
  for (const [itemId, value] of Object.entries(regions.dataBindings)) {
    const binding = readSafeBinding(value, itemId);
    if (binding) dataBindings[itemId] = binding;
  }

  return { dataBindings };
}

function readPublishedLivePages(database: Database.Database): LivePageRow[] {
  return database
    .prepare(
      `
        SELECT
          registry.id,
          registry.page_key,
          registry.template_key,
          registry.label_zh,
          registry.label_en,
          live.config_json
        FROM display_page_registry AS registry
        INNER JOIN playback_profile_pages AS profile_page
          ON profile_page.page_id = registry.id
        INNER JOIN playback_profiles AS profile
          ON profile.id = profile_page.profile_id
          AND profile.profile_key = 'default'
          AND profile.is_default = 1
        INNER JOIN display_page_stage_configs AS live
          ON live.page_key = registry.page_key
          AND live.stage = 'live'
        WHERE registry.archived_at IS NULL
        ORDER BY profile_page.display_order ASC, registry.id ASC
      `
    )
    .all() as LivePageRow[];
}

function usageScopeLabel(scope: MetricDataBindingScope | null): string {
  if (scope === "inherit-device") return "inherited";
  if (scope) return scope;
  return "registered";
}

function registeredTemplateKey(pageId: string) {
  return pageId === "factory-circuit-guanyin" ? "factory-circuit" : pageId;
}

function isInScope(
  configuredScope: MetricDataBindingScope | null,
  scope: MetricUsageScope
) {
  if (scope === "all") return true;
  // Inherited bindings are intentionally retained as inherited. They apply to
  // a selected device context, but this management read model must not invent
  // a CL/KN effective scope for them.
  return configuredScope === null
    || configuredScope === "inherit-device"
    || configuredScope === scope;
}

function createUsageRow(args: {
  configuredScope: MetricDataBindingScope | null;
  consumerId: string;
  consumerType: MetricUsageConsumerType;
  inherited?: boolean;
  itemId: string | null;
  labelEn: string | null;
  labelZh: string | null;
  metricKey: string;
  pageId: string;
  pageInstanceId: number | null;
  pageKey: string;
  templateKey: string;
}): MetricUsageRow {
  const inherited = args.inherited ?? args.configuredScope === "inherit-device";
  return {
    configuredBindingScope: args.configuredScope,
    configuredScope: args.configuredScope,
    consumerId: args.consumerId,
    consumerType: args.consumerType,
    inherited,
    itemId: args.itemId,
    labelEn: args.labelEn,
    labelZh: args.labelZh,
    metricKey: args.metricKey,
    pageId: args.pageId,
    pageInstanceId: args.pageInstanceId,
    pageKey: args.pageKey,
    pageLabelEn: args.labelEn,
    pageLabelZh: args.labelZh,
    scopeLabel: usageScopeLabel(args.configuredScope),
    templateKey: args.templateKey
  };
}

function addRegisteredUsage(
  rows: MetricUsageRow[],
  seen: Set<string>,
  args: {
    consumerId: string;
    consumerType: "story" | "readiness";
    metricKeys: readonly string[];
    pageId: string;
    templateKey: string;
  }
) {
  for (const metricKey of new Set(args.metricKeys)) {
    if (typeof metricKey !== "string" || metricKey.trim().length === 0) continue;
    const identity = `${args.consumerType}|${args.consumerId}|${metricKey}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    rows.push(createUsageRow({
      configuredScope: null,
      consumerId: args.consumerId,
      consumerType: args.consumerType,
      itemId: null,
      labelEn: null,
      labelZh: null,
      metricKey,
      pageId: args.pageId,
      pageInstanceId: null,
      pageKey: args.pageId,
      templateKey: args.templateKey
    }));
  }
}

function addRegisteredConsumers(rows: MetricUsageRow[], seen: Set<string>) {
  for (const pageKey of widgetBindingPageKeys) {
    for (const binding of resolvePlaybackDisplayMetricBindings(pageKey)) {
      addRegisteredUsage(rows, seen, {
        consumerId: `story:${pageKey}.${binding.metricKey}`,
        consumerType: "story",
        metricKeys: [binding.metricKey, ...binding.dependencyKeys],
        pageId: pageKey,
        templateKey: registeredTemplateKey(pageKey)
      });
    }
  }

  for (const requirement of displayMetricRequirements) {
    addRegisteredUsage(rows, seen, {
      consumerId: `readiness:${requirement.pageId}.${requirement.requirementKey}`,
      consumerType: "readiness",
      metricKeys: [requirement.requirementKey, ...(requirement.dependencyKeys ?? [])],
      pageId: requirement.pageId,
      templateKey: registeredTemplateKey(requirement.pageId)
    });
  }
}

function addWidgetUsage(rows: MetricUsageRow[], page: LivePageRow) {
  const bindingPageKey = resolveWidgetDataBindingPageKey({
    pageKey: page.page_key,
    templateKey: page.template_key
  });
  if (!bindingPageKey) return;

  const regions = parseLiveBindingRegions(page.config_json);
  if (!regions) return;

  const normalized = normalizeMetricBoundPageConfig(bindingPageKey, regions);
  for (const item of Object.values(normalized.dataBindings)) {
    rows.push(createUsageRow({
      configuredScope: item.dataBinding.scope,
      consumerId: `widget:${page.page_key}.${item.itemId}`,
      consumerType: "widget",
      itemId: item.itemId,
      labelEn: page.label_en,
      labelZh: page.label_zh,
      metricKey: item.dataBinding.metricKey,
      pageId: page.page_key,
      pageInstanceId: page.id,
      pageKey: page.page_key,
      templateKey: page.template_key
    }));
  }
}

export function parseMetricUsageScope(value: unknown): MetricUsageScope | null {
  if (value === undefined) return "all";
  return typeof value === "string" && metricUsageScopes.includes(value as MetricUsageScope)
    ? value as MetricUsageScope
    : null;
}

export function readMetricUsage(
  database: Database.Database,
  options: { metricKey?: string; scope?: MetricUsageScope } = {}
): MetricUsageRow[] {
  const rows: MetricUsageRow[] = [];
  const registeredIdentities = new Set<string>();

  for (const page of readPublishedLivePages(database)) {
    addWidgetUsage(rows, page);
  }
  addRegisteredConsumers(rows, registeredIdentities);

  const metricKey = options.metricKey?.trim();
  const scope = options.scope ?? "all";
  return rows
    .filter((row) => (!metricKey || row.metricKey === metricKey) && isInScope(row.configuredScope, scope))
    .sort((left, right) => {
      const metricOrder = left.metricKey.localeCompare(right.metricKey);
      if (metricOrder !== 0) return metricOrder;
      const typeOrder = left.consumerType.localeCompare(right.consumerType);
      if (typeOrder !== 0) return typeOrder;
      const pageOrder = left.pageKey.localeCompare(right.pageKey);
      if (pageOrder !== 0) return pageOrder;
      return (left.itemId ?? left.consumerId).localeCompare(right.itemId ?? right.consumerId);
    });
}
