import type {
  CircuitConfig,
  DisplayReadinessFinding,
  DisplayReadinessPageSummary,
  DisplayReadinessReport
} from "@solar-display/shared";
import {
  displayCircuitSlotKeys,
  displayMetricRequirements,
  displaySlotRequirements
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

type TopicMappingRow = {
  enabled: number;
  metric_key: string;
  topic: string | null;
};

type CircuitRow = {
  display_slot: string | null;
  enabled: number;
  id: number;
  mqtt_topic: string | null;
  name_en: string | null;
  name_zh: string | null;
};

function toBoolean(value: unknown) {
  return value === true || value === 1;
}

function readTopicMappings() {
  return getDatabase()
    .prepare("SELECT metric_key, topic, enabled FROM topic_mappings")
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
    warningMin: null
  }));
}

function buildMetricFindings(): DisplayReadinessFinding[] {
  const mappings = new Map(readTopicMappings().map((row) => [row.metric_key, row]));

  return displayMetricRequirements.map((requirement) => {
    const mapping = mappings.get(requirement.requirementKey);
    const topic = mapping?.topic?.trim() ?? "";
    const available = Boolean(mapping && toBoolean(mapping.enabled) && topic.length > 0);

    return {
      blocking: !available,
      pageId: requirement.pageId,
      reason: available ? `mapped to ${topic}` : `missing MQTT mapping for ${requirement.requirementKey}`,
      requirementKey: requirement.requirementKey,
      sourceId: available ? topic : requirement.requirementKey,
      sourceType: "mqtt-metric",
      status: available ? "ready" : "blocking"
    };
  });
}

function buildSlotFindings(): DisplayReadinessFinding[] {
  const enabledCircuits = readCircuits().filter((circuit) => circuit.enabled);

  return displaySlotRequirements.map((requirement) => {
    const matches = enabledCircuits.filter(
      (circuit) => circuit.displaySlot === requirement.requirementKey
    );

    if (matches.length === 0) {
      return {
        blocking: true,
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

export function readDisplayReadinessReport(): DisplayReadinessReport {
  const findings = [...buildMetricFindings(), ...buildSlotFindings()];
  const pageIds = [...new Set(findings.map((finding) => finding.pageId))];
  const pages = pageIds.map((pageId) =>
    toPageSummary(
      pageId,
      findings.filter((finding) => finding.pageId === pageId)
    )
  );
  const mqttFindings = findings.filter((finding) => finding.sourceType === "mqtt-metric");
  const slotFindings = findings.filter((finding) => finding.sourceType === "circuit-slot");

  return {
    findings,
    generatedAt: new Date().toISOString(),
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
        readyCount: displayCircuitSlotKeys.length -
          slotFindings.filter((finding) => finding.status === "blocking").length
      },
      warningCount: findings.filter((finding) => finding.status === "warning").length
    }
  };
}
