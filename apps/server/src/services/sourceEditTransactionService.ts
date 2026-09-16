import type Database from "better-sqlite3";
import type {
  SingleSourceMutationPatch,
  SourceMappingConfiguration
} from "@solar-display/shared";
import {
  computeCanonicalHash,
  generateSourceRef,
  incrementCollectionRevision,
  readCollectionRevision,
  readReceiptReplay,
  storeReceipt,
  toSourceEditDomainError,
  toConfiguration,
  type StoredTopicMappingRow
} from "./sourceEditReceiptService.js";
import {
  canonicalizeMetricUnit,
  resolveCustomName,
  resolveMultiplier,
  validateSingleSourceCreation,
  validateSingleSourceDeletion,
  validateSingleSourceMutation
} from "./sourceEditValidationService.js";

export {
  canonicalizeMetricUnit,
  generateSourceRef,
  incrementCollectionRevision,
  readCollectionRevision,
  resolveCustomName,
  resolveMultiplier,
  toSourceEditDomainError,
  toConfiguration,
  type StoredTopicMappingRow
};

export type SingleSourceMutationInput = {
  authScope?: "cl" | "kn" | "all";
  expectedRevision: number;
  idempotencyKey?: string;
  patch: SingleSourceMutationPatch;
  sourceRef: string;
};

export type SingleSourceDeleteInput = {
  authScope?: "cl" | "kn" | "all";
  expectedRevision: number;
  idempotencyKey?: string;
  sourceRef: string;
};

export type SingleSourceCreateInput = {
  authScope?: "cl" | "kn" | "all";
  idempotencyKey?: string;
  source: SourceMappingConfiguration;
};

export function getTopicMappingBySourceRef(
  database: Database.Database,
  sourceRef: string
): StoredTopicMappingRow | undefined {
  return database
    .prepare("SELECT * FROM topic_mappings WHERE source_ref = ? LIMIT 1")
    .get(sourceRef) as StoredTopicMappingRow | undefined;
}

export async function saveSingleSourceMapping(
  database: Database.Database,
  input: SingleSourceMutationInput,
  mqttReconciler: () => Promise<boolean>
) {
  const { authScope, expectedRevision, idempotencyKey, patch, sourceRef } = input;
  const canonicalHash = idempotencyKey
    ? computeCanonicalHash({ expectedRevision, patch, sourceRef })
    : null;

  if (idempotencyKey && canonicalHash) {
    const replay = readReceiptReplay(database, idempotencyKey, canonicalHash);
    if (replay) return replay;
  }

  const commitResult = database.transaction(() => {
    const current = getTopicMappingBySourceRef(database, sourceRef);
    if (!current) {
      throw Object.assign(new Error("SOURCE_NOT_FOUND"), { code: "SOURCE_NOT_FOUND", statusCode: 404 });
    }

    const { targetKey, targetScope } = validateSingleSourceMutation({
      authScope,
      current,
      database,
      expectedRevision,
      patch,
      sourceRef
    });

    const nextEnabled = patch.enabled === undefined ? current.enabled : (patch.enabled ? 1 : 0);
    const nextTopic = patch.topic !== undefined ? patch.topic.trim() : current.topic;
    const nextUnit = patch.unit !== undefined ? canonicalizeMetricUnit(patch.unit) : current.unit;
    const nextValuePath = patch.valuePath !== undefined ? patch.valuePath.trim() : current.value_path;
    const nextNameZh = resolveCustomName(patch.nameZh, current.name_zh);
    const nextNameEn = resolveCustomName(patch.nameEn, current.name_en);
    const nextMultiplier = resolveMultiplier(patch.multiplier, current.multiplier ?? 1);
    const nextOffset = typeof patch.offset === "number" ? patch.offset : (current.offset ?? 0);
    const nextDecimalPlaces = typeof patch.decimalPlaces === "number"
      ? patch.decimalPlaces
      : (current.decimal_places ?? (nextUnit === "%" ? 1 : 2));

    const nextRevision = (current.config_revision ?? 1) + 1;

    database
      .prepare(`
        UPDATE topic_mappings
        SET
          metric_scope = ?,
          metric_key = ?,
          topic = ?,
          unit = ?,
          value_path = ?,
          name_zh = ?,
          name_en = ?,
          multiplier = ?,
          offset = ?,
          decimal_places = ?,
          enabled = ?,
          config_revision = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE source_ref = ?
      `)
      .run(
        targetScope,
        targetKey,
        nextTopic,
        nextUnit,
        nextValuePath,
        nextNameZh,
        nextNameEn,
        nextMultiplier,
        nextOffset,
        nextDecimalPlaces,
        nextEnabled,
        nextRevision,
        sourceRef
      );

    if (nextUnit !== current.unit) {
      database
        .prepare(`
          UPDATE live_metric_values
          SET unit = ?
          WHERE metric_scope = ? AND metric_key = ?
        `)
        .run(nextUnit, targetScope, targetKey);
    }

    const nextCollectionRev = incrementCollectionRevision(database);
    const updatedRow = getTopicMappingBySourceRef(database, sourceRef)!;

    return {
      collectionRevision: nextCollectionRev,
      configuration: toConfiguration(updatedRow),
      revision: nextRevision,
      sourceRef
    };
  })();

  const responseBody = {
    capabilities: {
      legacyReplaceSupported: true,
      versionedSourceEditing: true
    },
    collectionRevision: commitResult.collectionRevision,
    configuration: commitResult.configuration,
    persistence: "committed",
    revision: commitResult.revision,
    sourceRef: commitResult.sourceRef,
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey && canonicalHash) {
    storeReceipt(database, {
      canonicalHash,
      idempotencyKey,
      response: responseBody,
      sourceRef,
      statusCode: 200
    });
  }

  const runtimeReconciled = await mqttReconciler().catch(() => false);

  return {
    body: {
      ...responseBody,
      runtimeApplied: runtimeReconciled
    },
    replayed: false,
    statusCode: 200
  };
}

export async function deleteSingleSourceMapping(
  database: Database.Database,
  input: SingleSourceDeleteInput,
  mqttReconciler: () => Promise<boolean>
) {
  const { authScope, expectedRevision, idempotencyKey, sourceRef } = input;
  const canonicalHash = idempotencyKey
    ? computeCanonicalHash({ expectedRevision, sourceRef })
    : null;

  if (idempotencyKey && canonicalHash) {
    const replay = readReceiptReplay(database, idempotencyKey, canonicalHash);
    if (replay) return replay;
  }

  const commitResult = database.transaction(() => {
    const current = getTopicMappingBySourceRef(database, sourceRef);
    if (!current) {
      throw Object.assign(new Error("SOURCE_NOT_FOUND"), { code: "SOURCE_NOT_FOUND", statusCode: 404 });
    }

    validateSingleSourceDeletion({
      authScope,
      current,
      database,
      expectedRevision,
      sourceRef
    });

    database.prepare("DELETE FROM topic_mappings WHERE source_ref = ?").run(sourceRef);
    const nextCollectionRev = incrementCollectionRevision(database);

    return {
      collectionRevision: nextCollectionRev,
      revision: (current.config_revision ?? 1) + 1,
      sourceRef
    };
  })();

  const responseBody = {
    capabilities: {
      legacyReplaceSupported: true,
      versionedSourceEditing: true
    },
    collectionRevision: commitResult.collectionRevision,
    configuration: null,
    deleted: true,
    persistence: "committed",
    revision: commitResult.revision,
    sourceRef: commitResult.sourceRef,
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey && canonicalHash) {
    storeReceipt(database, {
      canonicalHash,
      idempotencyKey,
      response: responseBody,
      sourceRef,
      statusCode: 200
    });
  }

  const runtimeReconciled = await mqttReconciler().catch(() => false);

  return {
    body: {
      ...responseBody,
      runtimeApplied: runtimeReconciled
    },
    replayed: false,
    statusCode: 200
  };
}

export async function createSingleSourceMapping(
  database: Database.Database,
  input: SingleSourceCreateInput,
  mqttReconciler: () => Promise<boolean>
) {
  const { authScope, idempotencyKey, source } = input;
  const canonicalHash = idempotencyKey ? computeCanonicalHash({ source }) : null;

  if (idempotencyKey && canonicalHash) {
    const replay = readReceiptReplay(database, idempotencyKey, canonicalHash);
    if (replay) return replay;
  }

  const commitResult = database.transaction(() => {
    validateSingleSourceCreation({ authScope, database, source });

    const sourceRef = generateSourceRef(source.metricScope, source.metricKey);
    const unit = canonicalizeMetricUnit(source.unit);
    const nameZh = resolveCustomName(source.nameZh, null);
    const nameEn = resolveCustomName(source.nameEn, null);
    const multiplier = resolveMultiplier(source.multiplier, 1);
    const offset = typeof source.offset === "number" ? source.offset : 0;
    const decimalPlaces = typeof source.decimalPlaces === "number"
      ? source.decimalPlaces
      : (unit === "%" ? 1 : 2);

    database
      .prepare(`
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
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .run(
        sourceRef,
        source.metricScope,
        source.metricKey,
        source.topic.trim(),
        nameZh,
        nameEn,
        unit,
        source.valuePath?.trim() || "",
        multiplier,
        offset,
        decimalPlaces,
        source.enabled ? 1 : 0
      );

    const nextCollectionRev = incrementCollectionRevision(database);
    const createdRow = getTopicMappingBySourceRef(database, sourceRef)!;

    return {
      collectionRevision: nextCollectionRev,
      configuration: toConfiguration(createdRow),
      revision: 1,
      sourceRef
    };
  })();

  const responseBody = {
    capabilities: {
      legacyReplaceSupported: true,
      versionedSourceEditing: true
    },
    collectionRevision: commitResult.collectionRevision,
    configuration: commitResult.configuration,
    persistence: "committed",
    revision: 1,
    sourceRef: commitResult.sourceRef,
    timestamp: new Date().toISOString()
  };

  if (idempotencyKey && canonicalHash) {
    storeReceipt(database, {
      canonicalHash,
      idempotencyKey,
      response: responseBody,
      sourceRef: commitResult.sourceRef,
      statusCode: 201
    });
  }

  const runtimeReconciled = await mqttReconciler().catch(() => false);

  return {
    body: {
      ...responseBody,
      runtimeApplied: runtimeReconciled
    },
    replayed: false,
    statusCode: 201
  };
}
