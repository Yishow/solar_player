import type Database from "better-sqlite3";
import { isMetricScope, type MetricScope } from "@solar-display/shared";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import { listDerivedMetricDestinationIdentities } from "./metricDestinationOwnershipService.js";
import { checkLegacyMappingMeterSourceConflict } from "./meterSourceCatalogService.js";
import {
  canonicalizeMetricUnit,
  generateSourceRef,
  incrementCollectionRevision,
  readCollectionRevision,
  resolveCustomName,
  resolveMultiplier,
  type StoredTopicMappingRow
} from "./sourceEditTransactionService.js";

export type TopicMappingInput = {
  enabled?: boolean;
  metricKey: string;
  metricScope?: unknown;
  multiplier?: number;
  nameEn?: string;
  nameZh?: string;
  topic: string;
  unit?: string;
  valuePath?: string;
};

export type ReplaceCollectionOptions = {
  expectedCollectionRevision?: number;
};

export function replaceTopicMappingsCollection(
  database: Database.Database,
  topics: TopicMappingInput[],
  options: ReplaceCollectionOptions = {}
) {
  const currentCollectionRev = readCollectionRevision(database);
  if (options.expectedCollectionRevision !== undefined) {
    if (options.expectedCollectionRevision !== currentCollectionRev) {
      throw Object.assign(new Error("COLLECTION_REVISION_CONFLICT"), {
        code: "COLLECTION_REVISION_CONFLICT",
        currentCollectionRevision: currentCollectionRev,
        statusCode: 409
      });
    }
  } else {
    throw Object.assign(new Error("LEGACY_WRITE_REQUIRES_REVISION"), {
      code: "LEGACY_WRITE_REQUIRES_REVISION",
      currentCollectionRevision: currentCollectionRev,
      statusCode: 409
    });
  }

  const derivedMetricIdentities = listDerivedMetricDestinationIdentities(database);
  const existingRows = database
    .prepare("SELECT * FROM topic_mappings")
    .all() as StoredTopicMappingRow[];
  const existingMappings = new Map<string, StoredTopicMappingRow>(
    existingRows.map((mapping) => [`${mapping.metric_scope}:${mapping.metric_key}`, mapping])
  );

  const resolvedTopics: Array<TopicMappingInput & { metricScope: MetricScope }> = [];
  const seen = new Set<string>();

  for (const topic of topics) {
    const candidates = [...existingMappings.values()].filter(
      (mapping) => mapping.metric_key === topic.metricKey
    );
    const metricScope = topic.metricScope === undefined && candidates.length === 1
      ? candidates[0]?.metric_scope
      : topic.metricScope;

    if (!isMetricScope(metricScope)) {
      throw Object.assign(new Error("INVALID_METRIC_SCOPE"), { code: "INVALID_METRIC_SCOPE", statusCode: 400 });
    }

    const identity = `${metricScope}:${topic.metricKey}`;
    if (derivedMetricIdentities.has(identity)) {
      throw Object.assign(new Error(`Metric identity is already provided by an enabled derived metric: ${identity}`), {
        code: "DERIVED_METRIC_IDENTITY_CONFLICT",
        statusCode: 409
      });
    }

    if (topic.enabled !== false && isSolarAdapterManagedMetricIdentity(metricScope, topic.metricKey)) {
      throw Object.assign(new Error(`Metric identity is managed by the Solar source adapter: ${identity}`), {
        code: "MANAGED_SOURCE_METRIC_CONFLICT",
        statusCode: 409
      });
    }

    if (seen.has(identity)) {
      throw Object.assign(new Error(`Duplicate topic mapping identity: ${identity}`), {
        code: "DUPLICATE_METRIC_IDENTITY",
        statusCode: 400
      });
    }

    seen.add(identity);
    resolvedTopics.push({ ...topic, metricScope });
  }

  if (checkLegacyMappingMeterSourceConflict(database, existingMappings, resolvedTopics, canonicalizeMetricUnit, resolveMultiplier)) {
    throw Object.assign(new Error("E1_SOURCE_REVISION_REQUIRED"), {
      code: "E1_SOURCE_REVISION_REQUIRED",
      statusCode: 409
    });
  }

  database.transaction(() => {
    const incomingIdentities = new Set(resolvedTopics.map((t) => `${t.metricScope}:${t.metricKey}`));

    for (const [identity, existing] of existingMappings.entries()) {
      if (!incomingIdentities.has(identity)) {
        database.prepare("DELETE FROM topic_mappings WHERE id = ?").run(existing.id);
      }
    }

    const updateStmt = database.prepare(`
      UPDATE topic_mappings
      SET
        topic = ?,
        name_zh = ?,
        name_en = ?,
        unit = ?,
        value_path = ?,
        multiplier = ?,
        enabled = ?,
        config_revision = config_revision + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const insertStmt = database.prepare(`
      INSERT INTO topic_mappings (
        source_ref,
        config_revision,
        metric_scope,
        metric_key,
        topic,
        name_zh,
        name_en,
        unit,
        value_path,
        selector_json,
        multiplier,
        offset,
        decimal_places,
        enabled,
        created_at,
        updated_at
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const updateLiveUnit = database.prepare(`
      UPDATE live_metric_values
      SET unit = ?
      WHERE metric_scope = ? AND metric_key = ?
    `);

    for (const topic of resolvedTopics) {
      const identity = `${topic.metricScope}:${topic.metricKey}`;
      const existing = existingMappings.get(identity);
      const unit = canonicalizeMetricUnit(topic.unit);
      const nameZh = resolveCustomName(topic.nameZh, existing?.name_zh ?? null);
      const nameEn = resolveCustomName(topic.nameEn, existing?.name_en ?? null);
      const multiplier = resolveMultiplier(topic.multiplier, existing?.multiplier ?? 1);
      const enabledInt = topic.enabled === false ? 0 : 1;

      if (existing) {
        updateStmt.run(
          topic.topic,
          nameZh,
          nameEn,
          unit,
          topic.valuePath?.trim() || null,
          multiplier,
          enabledInt,
          existing.id
        );
      } else {
        const sourceRef = generateSourceRef(topic.metricScope, topic.metricKey);
        insertStmt.run(
          sourceRef,
          topic.metricScope,
          topic.metricKey,
          topic.topic,
          nameZh,
          nameEn,
          unit,
          topic.valuePath?.trim() || null,
          multiplier,
          unit === "%" ? 1 : 2,
          enabledInt
        );
      }

      if (unit) {
        updateLiveUnit.run(unit, topic.metricScope, topic.metricKey);
      }
    }

    incrementCollectionRevision(database);
  })();

  return {
    collectionRevision: readCollectionRevision(database)
  };
}
