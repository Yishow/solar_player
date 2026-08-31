import {
  compileEffectiveBindingPlan,
  normalizeMetricBoundPageConfig,
  resolvePlaybackBindingItemConstraints,
  resolveWidgetDataBindingPageKey,
  type DisplayPreviewContextSelection,
  type EffectiveBindingPlan,
  type ConfigStage,
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { resolveMetric } from "./MetricResolver.js";
import { readDisplayPageInstance } from "./displayPageRegistryService.js";
import { readStageConfig } from "./displayPagePublishingService.js";
import { resolveDisplayPreviewContext } from "./displayPreviewContextService.js";
import { resolveServerPlaybackMetricCatalog } from "./derivedMetricCatalogService.js";
import { readDerivedMetricRegistryRevision } from "./derivedMetricRegistryService.js";

type CachedBindingPlan = {
  cacheKey: string;
  plan: EffectiveBindingPlan;
};

/**
 * An editing session produces a new entry for every page configuration and
 * preview context it touches, so the cache needs a ceiling; without one it
 * grows for the lifetime of the process. Eviction only costs a recompile.
 */
const MAX_BINDING_PLAN_CACHE_ENTRIES = 64;

export function createBoundedCache<T>(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Bounded cache limit must be a positive integer");
  }
  const entries = new Map<string, T>();
  return {
    get(key: string) {
      return entries.get(key);
    },
    set(key: string, value: T) {
      entries.delete(key);
      entries.set(key, value);
      while (entries.size > limit) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    }
  };
}

const bindingPlanCache = createBoundedCache<CachedBindingPlan>(MAX_BINDING_PLAN_CACHE_ENTRIES);

function readBindingPlan(
  pageId: string,
  contextKey: string,
  siteScope: "cl" | "kn",
  stage: ConfigStage
) {
  const page = readDisplayPageInstance(pageId);
  if (!page) {
    const error = new Error(`Unknown display page: ${pageId}`);
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 404;
    throw error;
  }
  const bindingPageKey = resolveWidgetDataBindingPageKey({
    pageKey: pageId,
    templateKey: page.templateKey
  });
  if (!bindingPageKey) {
    const error = new Error(`Display page does not support metric data preview: ${pageId}`);
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 422;
    throw error;
  }

  const config = readStageConfig(pageId, stage);
  // The plan carries the source class and dependency identities the derived
  // metric registry resolved, so a registry change invalidates it even when the
  // page configuration and context are untouched. A missing revision means the
  // registry state cannot be read, in which case the plan is not cached at all.
  const registryRevision = readDerivedMetricRegistryRevision();
  const cacheKey = JSON.stringify([
    pageId,
    stage,
    config.version,
    config.updatedAt,
    contextKey,
    registryRevision
  ]);
  const cached = registryRevision === null ? undefined : bindingPlanCache.get(cacheKey);
  if (cached) {
    return { ...cached, configRevision: config.version };
  }

  const normalized = normalizeMetricBoundPageConfig(bindingPageKey, config.regions);
  const compiled = compileEffectiveBindingPlan({
    catalog: resolveServerPlaybackMetricCatalog(bindingPageKey),
    context: { contextKey, siteScope },
    itemConstraints: resolvePlaybackBindingItemConstraints(bindingPageKey),
    items: Object.values(normalized.dataBindings),
    pageId
  });
  if (!compiled.ok) {
    const error = new Error(
      `Invalid live widget binding ${pageId}.${compiled.error.itemId}: ${compiled.error.code}`
    );
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 422;
    throw error;
  }

  const entry = { cacheKey, plan: compiled.plan };
  if (registryRevision !== null) {
    bindingPlanCache.set(cacheKey, entry);
  }
  return { ...entry, configRevision: config.version };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPreviewRequest(value: unknown): {
  selection: DisplayPreviewContextSelection | unknown;
  stage: ConfigStage;
} {
  if (!isRecord(value) || !("context" in value)) {
    return { selection: value, stage: "live" };
  }
  const unsupportedField = Object.keys(value).find(
    (field) => field !== "context" && field !== "stage"
  );
  if (unsupportedField || (value.stage !== "draft" && value.stage !== "live")) {
    const error = new Error("Data preview request must contain only context and a valid stage");
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 400;
    throw error;
  }
  return { selection: value.context, stage: value.stage };
}

export function readDisplayDataPreview(
  pageId: string,
  selection: DisplayPreviewContextSelection | unknown
) {
  const request = readPreviewRequest(selection);
  const context = resolveDisplayPreviewContext(request.selection);
  const { cacheKey, configRevision, plan } = readBindingPlan(
    pageId,
    context.contextKey,
    context.siteScope,
    request.stage
  );
  const database = getDatabase();
  const nowMs = Date.now();

  return {
    cacheKey,
    configRevision,
    configStage: request.stage,
    context,
    items: plan.items.map((binding) => {
      const metric = resolveMetric(database, {
        metricKey: binding.metricKey,
        metricScope: binding.effectiveScope
      }, nowMs);
      return {
        configuredScope: binding.configuredScope,
        dependencyIdentities: binding.dependencyIdentities,
        effectiveScope: binding.effectiveScope,
        format: binding.format ?? null,
        freshness: metric.freshness,
        itemId: binding.itemId,
        metricKey: binding.metricKey,
        provenance: metric.provenance,
        quality: metric.quality,
        sourceClass: binding.sourceClass,
        timestamp: metric.timestamp,
        unit: metric.unit,
        value: metric.value
      };
    }),
    pageId
  };
}

export function clearDisplayDataPreviewCacheForTests() {
  bindingPlanCache.clear();
}
