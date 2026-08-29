import type {
  CircuitConfig,
  DisplayReadinessFinding,
  DisplayReadinessPageSummary,
  DisplayReadinessReport,
  MetricScope,
  SiteScope
} from "@solar-display/shared";
import {
  displayCircuitSlotKeys,
  displayMetricRequirements,
  displaySlotRequirements,
  factoryGenerationDerivedRequirementKeys,
  resolveDisplayReadinessRequirementsForSite
} from "@solar-display/shared";
import { scopedIdentityKey } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import {
  evaluateFactoryGenerationAggregate,
  evaluateFactoryGenerationScope,
  resolveFactoryGenerationScope
} from "./factoryGenerationAggregateService.js";
import { readDefaultPlaybackPageRows } from "./playbackProfileService.js";
import { resolveLiveMetricRequirementsForPage } from "@solar-display/shared";
import { readScopedLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { evaluatePageFreshnessForRequirements } from "./freshnessPolicyService.js";

type TopicMappingRow = {
  enabled: number;
  metric_key: string;
  metric_scope: MetricScope;
  topic: string | null;
};

type CircuitRow = {
  display_slot: string | null;
  enabled: number;
  id: number;
  mqtt_topic: string | null;
  name_en: string | null;
  name_zh: string | null;
  page_key: string;
};

function toBoolean(value: unknown) {
  return value === true || value === 1;
}

function readTopicMappings() {
  return getDatabase()
    .prepare("SELECT metric_scope, metric_key, topic, enabled FROM topic_mappings")
    .all() as TopicMappingRow[];
}

function readCircuits(): CircuitConfig[] {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          id,
          name_zh,
          name_en,
          mqtt_topic,
          display_slot,
          page_key,
          enabled
        FROM circuit_configs
      `
    )
    .all() as CircuitRow[];

  return rows.map((row) => ({
    attentionMax: null,
    attentionMin: null,
    displayOrder: null,
    displaySlot: row.display_slot,
    enabled: toBoolean(row.enabled),
    icon: null,
    id: row.id,
    mqttTopic: row.mqtt_topic,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    normalMax: null,
    normalMin: null,
    ratedCapacity: null,
    unit: null,
    warningMax: null,
    warningMin: null,
    pageKey: row.page_key
  }));
}

const factoryGenerationRequirementKeys = new Set(factoryGenerationDerivedRequirementKeys);
const canonicalGenerationMetricKeyByRequirement: Record<string, "todayGeneration" | "totalGeneration"> = {
  accumulatedCarbonReductionTons: "totalGeneration",
  accumulatedGenerationGwh: "totalGeneration",
  plantedTreeEquivalent: "totalGeneration",
  todayCo2Reduction: "todayGeneration",
  todayGeneration: "todayGeneration",
  totalCo2Reduction: "totalGeneration",
  totalGeneration: "totalGeneration"
};

function readCanonicalGenerationValue(requirementKey: string) {
  const metricKey = canonicalGenerationMetricKeyByRequirement[requirementKey];
  if (!metricKey) {
    return false;
  }
  const row = getDatabase()
    .prepare("SELECT value FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = ?")
    .get(metricKey) as { value: number | null } | undefined;
  return typeof row?.value === "number" && Number.isFinite(row.value);
}

function formatAggregateIssue(
  issue: ReturnType<typeof evaluateFactoryGenerationAggregate>["issues"][number]
) {
  return `${issue.factory} ${issue.field} ${issue.reason}`;
}

function readSustainabilityFactoryScope() {
  const pages = readDefaultPlaybackPageRows().filter((page) =>
    page.page_key === "factory-circuit" || page.page_key === "factory-circuit-guanyin"
  );

  return resolveFactoryGenerationScope(
    pages.map((page) => ({ enabled: toBoolean(page.enabled), pageKey: page.page_key }))
  );
}

function resolveReadinessMetricScope(pageId: string, siteScope?: SiteScope): SiteScope {
  return siteScope ?? (pageId === "factory-circuit-guanyin" ? "kn" : "cl");
}

function buildMetricFindings(
  now: Date,
  siteScope?: SiteScope
): DisplayReadinessFinding[] {
  const mappings = new Map(
    readTopicMappings().map((row) => [scopedIdentityKey(row.metric_scope, row.metric_key), row])
  );
  const readMapping = (metricScope: MetricScope, metricKey: string) =>
    mappings.get(scopedIdentityKey(metricScope, metricKey));
  const aggregate = evaluateFactoryGenerationAggregate(getDatabase(), now);
  const metricRequirements = siteScope
    ? resolveDisplayReadinessRequirementsForSite(siteScope).filter(
        (requirement) => requirement.sourceType !== "circuit-slot"
      )
    : displayMetricRequirements;

  return metricRequirements.map((requirement) => {
    const metricScope = resolveReadinessMetricScope(requirement.pageId, siteScope);
    const metricKeys = requirement.dependencyKeys ?? [requirement.requirementKey];
    const directMapping = readMapping(metricScope, requirement.requirementKey);
    const directTopic = directMapping?.topic?.trim() ?? "";
    const directAvailable =
      Boolean(directMapping && toBoolean(directMapping.enabled) && directTopic.length > 0);
    const derivedDependencyKeys = metricKeys.filter((metricKey) => metricKey !== requirement.requirementKey);
    const derivedMappings = derivedDependencyKeys.map((metricKey) => ({
      metricKey,
      mapping: readMapping(metricScope, metricKey)
    }));
    const derivedAvailable =
      derivedMappings.length > 0 &&
      derivedMappings.every(
        ({ mapping }) =>
          Boolean(mapping && toBoolean(mapping.enabled) && (mapping.topic?.trim().length ?? 0) > 0)
      );
    const available =
      requirement.sourceType === "derived-metric"
        ? directAvailable || derivedAvailable
        : directAvailable;
    const derivedReason = derivedMappings
      .map(({ mapping, metricKey }) => mapping?.topic?.trim() || metricKey)
      .join(", ");

    if (factoryGenerationRequirementKeys.has(requirement.requirementKey)) {
      const scope = siteScope
        ? siteScope === "cl"
          ? "CL"
          : "KN"
        : requirement.pageId === "sustainability"
          ? readSustainabilityFactoryScope()
          : "CL+KN";
      if (scope === "none") {
        return {
          blocking: true,
          metricScope,
          pageId: requirement.pageId,
          reason: "no factory selected in playback settings",
          requirementKey: requirement.requirementKey,
          sourceId: null,
          sourceType: requirement.sourceType,
          status: "blocking"
        };
      }
      const requiredScopes: SiteScope[] = scope === "CL+KN" ? ["cl", "kn"] : [scope.toLowerCase() as SiteScope];
      const sourceMappings = requiredScopes.flatMap((metricScope) =>
        ["todayMwh", "monthMwh", "totalMwh"].map((suffix) => {
          const metricKey = `factoryGeneration.${suffix}`;
          return { metricKey: `${metricScope}:${metricKey}`, mapping: readMapping(metricScope, metricKey) };
        })
      );
      const sourceMappingsAvailable = sourceMappings.every(
        ({ mapping }) =>
          Boolean(mapping && toBoolean(mapping.enabled) && (mapping.topic?.trim().length ?? 0) > 0)
      );
      const sourceTopics = [
        ...new Set(
          sourceMappings
            .map(({ mapping }) => mapping?.topic?.trim())
            .filter((topic): topic is string => Boolean(topic))
        )
      ].join(", ");
      if (!sourceMappingsAvailable) {
        const missingKeys = sourceMappings
          .filter(({ mapping }) => !mapping || !toBoolean(mapping.enabled) || !mapping.topic?.trim())
          .map(({ metricKey }) => metricKey)
          .join(", ");
        return {
          blocking: true,
          metricScope,
          pageId: requirement.pageId,
          reason: `missing CL/KN MQTT mapping: ${missingKeys}`,
          requirementKey: requirement.requirementKey,
          sourceId: sourceTopics || null,
          sourceType: requirement.sourceType,
          status: "blocking"
        };
      }

      const scopedEvaluation = scope === "CL+KN"
        ? aggregate
        : evaluateFactoryGenerationScope(getDatabase(), scope, now);
      if (scopedEvaluation.state !== "ready") {
        const hasCanonicalFallback = scope === "CL+KN"
          && readCanonicalGenerationValue(requirement.requirementKey);
        return {
          blocking: false,
          metricScope,
          pageId: requirement.pageId,
          reason: `${scopedEvaluation.issues.map(formatAggregateIssue).join(", ")}${hasCanonicalFallback ? "; using last canonical generation" : ""}`,
          requirementKey: requirement.requirementKey,
          sourceId: sourceTopics,
          sourceType: requirement.sourceType,
          status: "warning"
        };
      }

      return {
        blocking: false,
        metricScope,
        pageId: requirement.pageId,
        reason: scope === "CL+KN" ? "CL + KN MQTT aggregate ready" : `${scope} MQTT ready`,
        requirementKey: requirement.requirementKey,
        sourceId: sourceTopics,
        sourceType: requirement.sourceType,
        status: "ready"
      };
    }

    return {
      blocking: !available,
      metricScope,
      pageId: requirement.pageId,
      reason: available
        ? directAvailable
          ? `mapped to ${directTopic}`
          : `derived from ${derivedReason}`
        : requirement.sourceType === "derived-metric"
          ? `missing derived metric coverage for ${requirement.requirementKey}; expected ${metricKeys.join(", ")}`
          : `missing MQTT mapping for ${requirement.requirementKey}`,
      requirementKey: requirement.requirementKey,
      sourceId: available
        ? directAvailable
          ? directTopic
          : derivedReason
        : requirement.requirementKey,
      sourceType: requirement.sourceType,
      status: available ? "ready" : "blocking"
    };
  });
}

function buildSlotFindings(siteScope?: SiteScope): DisplayReadinessFinding[] {
  const enabledCircuits = readCircuits().filter((circuit) => circuit.enabled);
  const slotRequirements = siteScope
    ? resolveDisplayReadinessRequirementsForSite(siteScope).filter(
        (requirement) => requirement.sourceType === "circuit-slot"
      )
    : displaySlotRequirements;

  return slotRequirements.map((requirement) => {
    const metricScope = resolveReadinessMetricScope(requirement.pageId, siteScope);
    const matches = enabledCircuits.filter(
      (circuit) =>
        circuit.pageKey === requirement.pageId &&
        circuit.displaySlot === requirement.requirementKey
    );

    if (matches.length === 0) {
      return {
        blocking: true,
        metricScope,
        pageId: requirement.pageId,
        reason: `missing explicit slot binding for ${requirement.requirementKey}`,
        requirementKey: requirement.requirementKey,
        sourceId: null,
        sourceType: "circuit-slot",
        status: "blocking"
      };
    }

    if (matches.length > 1) {
      return {
        blocking: true,
        metricScope,
        pageId: requirement.pageId,
        reason: `slot conflict: ${requirement.requirementKey} is claimed by multiple circuits`,
        requirementKey: requirement.requirementKey,
        sourceId: matches.map((circuit) => String(circuit.id)).join(","),
        sourceType: "circuit-slot",
        status: "blocking"
      };
    }

    return {
      blocking: false,
      metricScope,
      pageId: requirement.pageId,
      reason: `bound to ${matches[0]?.nameZh ?? matches[0]?.nameEn ?? matches[0]?.mqttTopic ?? "circuit"}`,
      requirementKey: requirement.requirementKey,
      sourceId: String(matches[0]?.id ?? ""),
      sourceType: "circuit-slot",
      status: "ready"
    };
  });
}

function toPageSummary(
  pageId: DisplayReadinessFinding["pageId"],
  findings: DisplayReadinessFinding[]
): DisplayReadinessPageSummary {
  const blockingCount = findings.filter((finding) => finding.status === "blocking").length;
  const warningCount = findings.filter((finding) => finding.status === "warning").length;
  const readyCount = findings.filter((finding) => finding.status === "ready").length;

  return {
    blockingCount,
    pageId,
    readyCount,
    status: blockingCount > 0 ? "blocking" : warningCount > 0 ? "warning" : "ready",
    warningCount
  };
}

export function readDisplayReadinessReport(
  options: { now?: Date; siteScope?: SiteScope } = {}
): DisplayReadinessReport {
  const now = options.now ?? new Date();
  const scopes: SiteScope[] = options.siteScope ? [options.siteScope] : ["cl", "kn"];
  const rawFindings = scopes.flatMap((siteScope) => [
    ...buildMetricFindings(now, siteScope),
    ...buildSlotFindings(siteScope)
  ]);
  const findings = rawFindings.map((finding) => {
    if (finding.sourceType === "circuit-slot") {
      return finding;
    }
    if (factoryGenerationRequirementKeys.has(finding.requirementKey)) {
      return finding;
    }
    const metricScope = finding.metricScope;
    const siteScope = metricScope === "global" ? undefined : metricScope;
    const liveMetrics = readScopedLiveMetricsSnapshot(metricScope, getDatabase()).metrics;
    const requirement = resolveLiveMetricRequirementsForPage(
      finding.pageId,
      siteScope
    ).find((candidate) => candidate.requirementKey === finding.requirementKey);
    if (!requirement) {
      return finding;
    }
    const freshness = evaluatePageFreshnessForRequirements({
      metrics: liveMetrics,
      nowMs: now.getTime(),
      requirements: [requirement]
    });
    const metricFreshness = freshness.freshness;
    if (!metricFreshness) {
      return finding;
    }
    return {
      ...finding,
      freshness: metricFreshness,
      ...(finding.status === "ready"
        && metricFreshness.state !== "live"
        && metricFreshness.state !== "unavailable"
        ? {
            reason: `${finding.reason}; freshness=${metricFreshness.state}`,
            status: "warning" as const
          }
        : {})
    };
  });
  const pageIds = [...new Set(findings.map((finding) => finding.pageId))];
  const pages = pageIds.map((pageId) =>
    toPageSummary(
      pageId,
      findings.filter((finding) => finding.pageId === pageId)
    )
  );
  const mqttFindings = findings.filter(
    (finding) =>
      finding.sourceType === "mqtt-metric"
      || factoryGenerationRequirementKeys.has(finding.requirementKey)
  );
  const slotFindings = findings.filter((finding) => finding.sourceType === "circuit-slot");

  return {
    findings,
    generatedAt: now.toISOString(),
    pages,
    summary: {
      blockingCount: findings.filter((finding) => finding.status === "blocking").length,
      mqttCoverage: {
        blockingCount: mqttFindings.filter((finding) => finding.status === "blocking").length,
        readyCount: mqttFindings.filter((finding) => finding.status === "ready").length
      },
      readyCount: findings.filter((finding) => finding.status === "ready").length,
      slotCoverage: {
        blockingCount: slotFindings.filter((finding) => finding.status === "blocking").length,
        readyCount: (options.siteScope ? slotFindings.length : displayCircuitSlotKeys.length) -
          slotFindings.filter((finding) => finding.status === "blocking").length
      },
      warningCount: findings.filter((finding) => finding.status === "warning").length
    }
  };
}
