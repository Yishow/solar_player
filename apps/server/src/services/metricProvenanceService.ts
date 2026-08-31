import type Database from "better-sqlite3";
import {
  isMetricScope,
  type DerivedMetricDefinition,
  type MetricScope
} from "@solar-display/shared";
import {
  readMetricInventory,
  type MetricInventoryRow,
  type MetricInventoryScope
} from "./metricInventoryService.js";
import { isSolarAdapterManagedMetricIdentity } from "../mqtt/SolarSourceAdapter.js";
import {
  listDerivedMetricDefinitions
} from "./derivedMetricRegistryService.js";
import {
  readMetricUsage,
  type MetricUsageRow
} from "./metricUsageService.js";
import { safeDiagnosticText } from "./safeDiagnosticText.js";

export const METRIC_PROVENANCE_DEFAULT_MAX_DEPTH = 4;
export const METRIC_PROVENANCE_DEFAULT_MAX_NODES = 100;
export const METRIC_PROVENANCE_MAX_DEPTH = 6;
export const METRIC_PROVENANCE_MAX_NODES = 200;
export const METRIC_PROVENANCE_MAX_TEXT = 256;

export const metricProvenanceNodeCategories = [
  "source-connection",
  "managed-source",
  "mqtt-topic",
  "semantic-metric",
  "calculation-setting",
  "derived-metric",
  "widget",
  "page",
  "readiness-consumer"
] as const;
export type MetricProvenanceNodeCategory = (typeof metricProvenanceNodeCategories)[number];

export const metricProvenanceEdgeKinds = ["produces", "depends-on", "used-by"] as const;
export type MetricProvenanceEdgeKind = (typeof metricProvenanceEdgeKinds)[number];

export type MetricProvenanceMetadataValue = string | number | boolean | null;
export type MetricProvenanceMetadata = Record<string, MetricProvenanceMetadataValue>;

export type MetricProvenanceNode = {
  category: MetricProvenanceNodeCategory;
  id: string;
  label: string;
  metadata?: MetricProvenanceMetadata;
  scope: MetricScope | null;
  status: string | null;
};

export type MetricProvenanceEdge = {
  from: string;
  kind: MetricProvenanceEdgeKind;
  to: string;
};

export type MetricProvenanceQuery = {
  maxDepth?: number;
  maxNodes?: number;
  metricKey: string;
  scope: MetricScope;
};

export type MetricProvenanceGraph = {
  edges: MetricProvenanceEdge[];
  maxDepth: number;
  maxNodes: number;
  metricKey: string;
  nodes: MetricProvenanceNode[];
  scope: MetricScope;
  truncated: boolean;
};

export type MetricProvenanceQueryError = {
  code: "INVALID_METRIC_PROVENANCE_QUERY";
  message: string;
};

export type ParsedMetricProvenanceQuery =
  | { ok: true; query: MetricProvenanceQuery }
  | { error: MetricProvenanceQueryError; ok: false };

const safeStatuses = new Set([
  "active",
  "configured",
  "degraded",
  "delayed",
  "fresh",
  "healthy",
  "historical",
  "idle-topic",
  "inherited",
  "live",
  "managed",
  "not-evaluated",
  "ready",
  "registered",
  "stale",
  "unavailable",
  "unknown"
]);
const calculationSettingLabels: Readonly<Record<string, string>> = {
  carbonEmissionFactor: "Carbon emission factor",
  co2AutoConvertSmallToKg: "CO₂ unit conversion",
  estimatedTariffPerKwh: "Estimated tariff per kWh",
  householdDailyUsageKwh: "Household daily usage",
  householdMonthlyUsageKwh: "Household monthly usage",
  treeEquivalentFactor: "Tree equivalent factor"
};

type SafeRecord = Record<string, unknown>;

type ProvenanceContext =
  | { kind: "calculation-setting"; settingKey: string; unit: string }
  | { kind: "consumer"; scope: MetricScope; usage: MetricUsageRow }
  | { kind: "derived"; definition: DerivedMetricDefinition; row: MetricInventoryRow; scope: MetricScope }
  | { kind: "managed-source"; sourceId: string; sourceClass: string; scope: MetricScope }
  | { kind: "semantic-metric"; row: MetricInventoryRow }
  | { kind: "source-connection" }
  | { kind: "topic"; sourceClass: string; sourceId: string | null; sourceTopic: string; scope: MetricScope };

type Relation = {
  context: ProvenanceContext;
  from: string;
  kind: MetricProvenanceEdgeKind;
  to: string;
};

type RegisteredNode = {
  context: ProvenanceContext;
  key: string;
  node: MetricProvenanceNode;
};

/**
 * Keep labels and metadata bounded while removing the credential forms that
 * can occur in operator-configured MQTT topics or URL-like source labels.
 */
export function safeMetricProvenanceText(value: unknown): string | null {
  return safeDiagnosticText(value, METRIC_PROVENANCE_MAX_TEXT);
}

function safeMetadata(entries: SafeRecord): MetricProvenanceMetadata | undefined {
  const metadata: MetricProvenanceMetadata = {};
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value === "string") {
      const safeValue = safeMetricProvenanceText(value);
      if (safeValue !== null) metadata[key] = safeValue;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value)) metadata[key] = value;
      continue;
    }
    if (typeof value === "boolean" || value === null) metadata[key] = value;
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function safeStatus(value: unknown): string {
  const status = safeMetricProvenanceText(value);
  return status && safeStatuses.has(status) ? status : "unknown";
}

function safeLabel(value: unknown, fallback: string): string {
  return safeMetricProvenanceText(value) ?? safeMetricProvenanceText(fallback) ?? "Unknown";
}

function metricNodeId(scope: MetricScope, metricKey: string) {
  return `semantic-metric:${scope}:${safeMetricProvenanceText(metricKey) ?? "metric"}`;
}

function derivedNodeId(scope: MetricScope, metricKey: string) {
  return `derived-metric:${scope}:${safeMetricProvenanceText(metricKey) ?? "derived"}`;
}

function topicNodeId(scope: MetricScope, sourceTopic: string) {
  return `mqtt-topic:${scope}:${safeMetricProvenanceText(sourceTopic) ?? "topic"}`;
}

function consumerNodeId(usage: MetricUsageRow) {
  const pageInstance = usage.pageInstanceId === null ? "registered" : String(usage.pageInstanceId);
  return `consumer:${usage.consumerType}:${safeMetricProvenanceText(usage.consumerId) ?? "consumer"}:${pageInstance}`;
}

function sourceRowStatus(row: MetricInventoryRow): string {
  return safeStatus(row.evaluation?.status ?? row.freshnessState);
}

function semanticMetricContext(row: MetricInventoryRow): ProvenanceContext {
  return { kind: "semantic-metric", row };
}

function semanticMetricNode(row: MetricInventoryRow): MetricProvenanceNode {
  return {
    category: "semantic-metric",
    id: metricNodeId(row.metricScope, row.metricKey),
    label: safeLabel(row.label, row.metricKey),
    metadata: safeMetadata({
      evaluationState: row.evaluationState,
      freshnessState: row.freshnessState,
      metricKey: row.metricKey,
      ownership: row.ownership,
      sourceClass: row.sourceClass,
      sourceId: row.provenance.sourceId,
      sourceTimestamp: row.provenance.sourceTimestamp,
      unit: row.unit,
      value: row.value
    }),
    scope: row.metricScope,
    status: sourceRowStatus(row)
  };
}

function derivedMetricNode(context: Extract<ProvenanceContext, { kind: "derived" }>): MetricProvenanceNode {
  const { definition, row, scope } = context;
  return {
    category: "derived-metric",
    id: derivedNodeId(scope, definition.metricKey),
    label: safeLabel(definition.name, definition.metricKey),
    metadata: safeMetadata({
      expression: definition.expression,
      fallbackPolicy: definition.fallbackPolicy,
      managed: definition.managed,
      metricKey: definition.metricKey,
      outputUnit: definition.outputUnit,
      revision: definition.revision
    }),
    scope,
    status: safeStatus(row.evaluation?.status ?? "not-evaluated")
  };
}

function topicNode(context: Extract<ProvenanceContext, { kind: "topic" }>): MetricProvenanceNode {
  const topic = safeMetricProvenanceText(context.sourceTopic) ?? "MQTT topic";
  return {
    category: "mqtt-topic",
    id: topicNodeId(context.scope, context.sourceTopic),
    label: topic,
    metadata: safeMetadata({
      sourceClass: context.sourceClass,
      sourceId: context.sourceId,
      topic
    }),
    scope: context.scope,
    status: "configured"
  };
}

function sourceConnectionNode(): MetricProvenanceNode {
  return {
    category: "source-connection",
    id: "source-connection:central-mqtt",
    label: "Central MQTT broker",
    metadata: safeMetadata({ connectionType: "mqtt", role: "source-connection" }),
    scope: null,
    status: "configured"
  };
}

function managedSourceNode(context: Extract<ProvenanceContext, { kind: "managed-source" }>): MetricProvenanceNode {
  return {
    category: "managed-source",
    id: `managed-source:${context.scope}:${safeMetricProvenanceText(context.sourceId) ?? "managed-source"}`,
    label: safeLabel(context.sourceId, "Managed source"),
    metadata: safeMetadata({
      ownership: "managed",
      sourceClass: context.sourceClass,
      sourceId: context.sourceId
    }),
    scope: context.scope,
    status: "managed"
  };
}

function calculationSettingNode(context: Extract<ProvenanceContext, { kind: "calculation-setting" }>): MetricProvenanceNode {
  return {
    category: "calculation-setting",
    id: `calculation-setting:${safeMetricProvenanceText(context.settingKey) ?? "setting"}`,
    label: calculationSettingLabels[context.settingKey] ?? "Calculation setting",
    metadata: safeMetadata({ settingKey: context.settingKey, unit: context.unit }),
    scope: null,
    status: "configured"
  };
}

function consumerNode(context: Extract<ProvenanceContext, { kind: "consumer" }>): MetricProvenanceNode {
  const usage = context.usage;
  const category: MetricProvenanceNodeCategory = usage.consumerType === "widget"
    ? "widget"
    : usage.consumerType === "readiness"
      ? "readiness-consumer"
      : "page";
  const label = usage.consumerType === "widget"
    ? `${usage.pageLabelZh ?? usage.pageLabelEn ?? usage.pageKey} / ${usage.itemId ?? usage.consumerId}`
    : usage.consumerType === "readiness"
      ? `Readiness / ${usage.consumerId}`
      : `Page / ${usage.pageKey}`;
  return {
    category,
    id: consumerNodeId(usage),
    label: safeLabel(label, usage.consumerId),
    metadata: safeMetadata({
      configuredScope: usage.configuredScope,
      consumerId: usage.consumerId,
      consumerType: usage.consumerType,
      inherited: usage.inherited,
      itemId: usage.itemId,
      pageInstanceId: usage.pageInstanceId,
      pageKey: usage.pageKey,
      templateKey: usage.templateKey
    }),
    scope: usage.configuredScope === "cl" || usage.configuredScope === "kn" || usage.configuredScope === "global"
      ? usage.configuredScope
      : usage.configuredScope === "inherit-device"
        ? context.scope
        : null,
    status: usage.inherited ? "inherited" : usage.consumerType === "widget" ? "active" : "registered"
  };
}

function contextNode(context: ProvenanceContext): MetricProvenanceNode {
  switch (context.kind) {
    case "calculation-setting":
      return calculationSettingNode(context);
    case "consumer":
      return consumerNode(context);
    case "derived":
      return derivedMetricNode(context);
    case "managed-source":
      return managedSourceNode(context);
    case "semantic-metric":
      return semanticMetricNode(context.row);
    case "source-connection":
      return sourceConnectionNode();
    case "topic":
      return topicNode(context);
  }
}

function contextKey(context: ProvenanceContext): string {
  switch (context.kind) {
    case "calculation-setting":
      return `calculation-setting:${safeMetricProvenanceText(context.settingKey) ?? "setting"}`;
    case "consumer":
      return `consumer:${consumerNodeId(context.usage)}`;
    case "derived":
      return `derived:${derivedNodeId(context.scope, context.definition.metricKey)}`;
    case "managed-source":
      return `managed:${managedSourceNode(context).id}`;
    case "semantic-metric":
      return `semantic:${metricNodeId(context.row.metricScope, context.row.metricKey)}`;
    case "source-connection":
      return sourceConnectionNode().id;
    case "topic":
      return `topic:${topicNodeId(context.scope, context.sourceTopic)}`;
  }
}

function outputScopeApplies(definition: DerivedMetricDefinition, scope: MetricScope) {
  return definition.outputScopePolicy === "global"
    ? scope === "global"
    : (definition.siteScopes ?? ["cl", "kn"]).includes(scope as "cl" | "kn");
}

function managedSolarSourceTopic(scope: MetricScope, metricKey: string) {
  if (scope === "global") return null;
  if (metricKey.startsWith("factoryGeneration.")) {
    return `solar/${scope.toUpperCase()}/summary`;
  }
  const zoneId = /^solarZone\.([^\.]+)\./u.exec(metricKey)?.[1];
  return zoneId ? `solar/${scope.toUpperCase()}/zone/${zoneId}` : null;
}

function emptyInventoryRow(metricKey: string, scope: MetricScope, unit: string): MetricInventoryRow {
  const managed = isSolarAdapterManagedMetricIdentity(scope, metricKey);
  return {
    evaluation: null,
    evaluationState: "not-evaluated",
    freshness: null,
    freshnessState: "unavailable",
    id: JSON.stringify([scope, metricKey]),
    label: metricKey,
    metricKey,
    metricScope: scope,
    ownership: managed ? "managed" : "catalog",
    provenance: {
      dependencies: [],
      sourceId: managed ? "solar-collector" : null,
      sourceTimestamp: null,
      sourceTopic: managedSolarSourceTopic(scope, metricKey)
    },
    sourceClass: managed ? "solar-adapter" : "mqtt-live",
    unit,
    value: null
  };
}

function parseMetricProvenanceInteger(value: unknown, fallback: number, maximum: number, name: string): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  if (!/^\d+$/u.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum || (name === "maxNodes" && parsed === 0)) {
    return null;
  }
  return parsed;
}

export function parseMetricProvenanceQuery(query: {
  maxDepth?: unknown;
  maxNodes?: unknown;
  metricKey?: unknown;
  scope?: unknown;
}): ParsedMetricProvenanceQuery {
  if (typeof query.metricKey !== "string" || query.metricKey.trim().length === 0) {
    return {
      error: { code: "INVALID_METRIC_PROVENANCE_QUERY", message: "metricKey is required" },
      ok: false
    };
  }
  if (!isMetricScope(query.scope)) {
    return {
      error: { code: "INVALID_METRIC_PROVENANCE_QUERY", message: "scope must be cl, kn, or global" },
      ok: false
    };
  }
  const maxDepth = parseMetricProvenanceInteger(
    query.maxDepth,
    METRIC_PROVENANCE_DEFAULT_MAX_DEPTH,
    METRIC_PROVENANCE_MAX_DEPTH,
    "maxDepth"
  );
  const maxNodes = parseMetricProvenanceInteger(
    query.maxNodes,
    METRIC_PROVENANCE_DEFAULT_MAX_NODES,
    METRIC_PROVENANCE_MAX_NODES,
    "maxNodes"
  );
  if (maxDepth === null || maxNodes === null) {
    return {
      error: {
        code: "INVALID_METRIC_PROVENANCE_QUERY",
        message: `maxDepth must be an integer from 0 to ${METRIC_PROVENANCE_MAX_DEPTH}; maxNodes must be an integer from 1 to ${METRIC_PROVENANCE_MAX_NODES}`
      },
      ok: false
    };
  }
  return {
    ok: true,
    query: {
      maxDepth,
      maxNodes,
      metricKey: query.metricKey.trim(),
      scope: query.scope
    }
  };
}

function addMetricRelations(
  database: Database.Database,
  context: Extract<ProvenanceContext, { kind: "semantic-metric" }>,
  definitions: ReadonlyMap<string, DerivedMetricDefinition>,
  inventoryRow: (scope: MetricScope, metricKey: string, unit?: string) => MetricInventoryRow | undefined
): Relation[] {
  const row = context.row;
  const semanticId = metricNodeId(row.metricScope, row.metricKey);
  const relations: Relation[] = [];
  const sourceTopic = row.provenance.sourceTopic;
  if (sourceTopic) {
    const topicContext: ProvenanceContext = {
      kind: "topic",
      scope: row.metricScope,
      sourceClass: row.sourceClass,
      sourceId: row.provenance.sourceId,
      sourceTopic
    };
    relations.push({
      context: topicContext,
      from: topicNodeId(row.metricScope, sourceTopic),
      kind: "produces",
      to: semanticId
    });
  }

  const definition = definitions.get(row.metricKey);
  if (definition && outputScopeApplies(definition, row.metricScope)) {
    const derivedContext: ProvenanceContext = {
      definition,
      kind: "derived",
      row,
      scope: row.metricScope
    };
    relations.push({
      context: derivedContext,
      from: derivedNodeId(row.metricScope, definition.metricKey),
      kind: "produces",
      to: semanticId
    });
  } else {
    for (const dependency of row.provenance.dependencies) {
      if (dependency.kind !== "metric" || !dependency.metricKey || !dependency.metricScope) continue;
      const dependencyRow = inventoryRow(
        dependency.metricScope,
        dependency.metricKey,
        dependency.unit
      ) ?? emptyInventoryRow(dependency.metricKey, dependency.metricScope, dependency.unit);
      const dependencyContext = semanticMetricContext(dependencyRow);
      relations.push({
        context: dependencyContext,
        from: semanticId,
        kind: "depends-on",
        to: metricNodeId(dependency.metricScope, dependency.metricKey)
      });
    }
  }

  for (const usage of readMetricUsage(database, {
    metricKey: row.metricKey,
    scope: row.metricScope
  })) {
    const consumerContext: ProvenanceContext = {
      kind: "consumer",
      scope: row.metricScope,
      usage
    };
    relations.push({
      context: consumerContext,
      from: semanticId,
      kind: "used-by",
      to: consumerNodeId(usage)
    });
  }
  return relations;
}

function addDerivedRelations(
  context: Extract<ProvenanceContext, { kind: "derived" }>,
  inventoryRow: (scope: MetricScope, metricKey: string, unit?: string) => MetricInventoryRow | undefined
): Relation[] {
  const derivedId = derivedNodeId(context.scope, context.definition.metricKey);
  return context.definition.inputs.map((input): Relation => {
    if (input.kind === "calculation-setting") {
      const settingContext: ProvenanceContext = {
        kind: "calculation-setting",
        settingKey: input.settingKey,
        unit: input.unit
      };
      return {
        context: settingContext,
        from: derivedId,
        kind: "depends-on",
        to: calculationSettingNode(settingContext).id
      };
    }
    const scope = input.scope === "output-site" ? context.scope : input.scope;
    const row = inventoryRow(scope, input.metricKey, input.unit)
      ?? emptyInventoryRow(input.metricKey, scope, input.unit);
    const metricContext = semanticMetricContext(row);
    return {
      context: metricContext,
      from: derivedId,
      kind: "depends-on",
      to: metricNodeId(scope, input.metricKey)
    };
  });
}

function addTopicRelations(
  context: Extract<ProvenanceContext, { kind: "topic" }>
): Relation[] {
  const topicId = topicNodeId(context.scope, context.sourceTopic);
  if (context.sourceId === "solar-collector" || context.sourceClass === "solar-adapter") {
    const managedContext: ProvenanceContext = {
      kind: "managed-source",
      scope: context.scope,
      sourceClass: context.sourceClass,
      sourceId: context.sourceId ?? "solar-collector"
    };
    return [{
      context: managedContext,
      from: managedSourceNode(managedContext).id,
      kind: "produces",
      to: topicId
    }];
  }
  const sourceContext: ProvenanceContext = { kind: "source-connection" };
  return [{
    context: sourceContext,
    from: sourceConnectionNode().id,
    kind: "produces",
    to: topicId
  }];
}

function addManagedSourceRelations(
  context: Extract<ProvenanceContext, { kind: "managed-source" }>
): Relation[] {
  const sourceContext: ProvenanceContext = { kind: "source-connection" };
  return [{
    context: sourceContext,
    from: sourceConnectionNode().id,
    kind: "produces",
    to: managedSourceNode(context).id
  }];
}

function relationsFor(
  database: Database.Database,
  context: ProvenanceContext,
  definitions: ReadonlyMap<string, DerivedMetricDefinition>,
  inventoryRow: (scope: MetricScope, metricKey: string, unit?: string) => MetricInventoryRow | undefined
): Relation[] {
  switch (context.kind) {
    case "semantic-metric":
      return addMetricRelations(database, context, definitions, inventoryRow);
    case "derived":
      return addDerivedRelations(context, inventoryRow);
    case "topic":
      return addTopicRelations(context);
    case "managed-source":
      return addManagedSourceRelations(context);
    default:
      return [];
  }
}

/**
 * Compose a bounded graph from authoritative read models. The graph uses
 * category-qualified internal keys for de-duplication, while exposing only
 * safe node and edge DTO fields.
 */
export function readMetricProvenance(
  database: Database.Database,
  input: MetricProvenanceQuery
): MetricProvenanceGraph | null {
  const maxDepth = input.maxDepth ?? METRIC_PROVENANCE_DEFAULT_MAX_DEPTH;
  const maxNodes = input.maxNodes ?? METRIC_PROVENANCE_DEFAULT_MAX_NODES;
  const definitions = new Map(
    listDerivedMetricDefinitions(database)
      .filter((definition) => definition.enabled)
      .map((definition) => [definition.metricKey, definition] as const)
  );
  const inventories = new Map<MetricScope, Map<string, MetricInventoryRow>>();
  const readScope = (scope: MetricScope) => {
    const cached = inventories.get(scope);
    if (cached) return cached;
    const rows = new Map(
      readMetricInventory(database, scope as MetricInventoryScope).map((row) => [row.metricKey, row] as const)
    );
    inventories.set(scope, rows);
    return rows;
  };
  const findInventoryRow = (scope: MetricScope, metricKey: string, unit?: string) =>
    readScope(scope).get(metricKey) ?? emptyInventoryRow(metricKey, scope, unit ?? "");
  const rootRow = readScope(input.scope).get(input.metricKey);
  if (!rootRow) return null;

  const nodes: MetricProvenanceNode[] = [];
  const edges: MetricProvenanceEdge[] = [];
  const registered = new Map<string, RegisteredNode>();
  const expanded = new Set<string>();
  const edgeIdentities = new Set<string>();
  const queue: Array<{ context: ProvenanceContext; depth: number; key: string }> = [];
  let truncated = false;

  const register = (context: ProvenanceContext) => {
    const key = contextKey(context);
    const existing = registered.get(key);
    if (existing) return existing;
    if (nodes.length >= maxNodes) {
      truncated = true;
      return null;
    }
    const node = contextNode(context);
    const registeredNode = { context, key, node } satisfies RegisteredNode;
    registered.set(key, registeredNode);
    nodes.push(node);
    return registeredNode;
  };

  const rootContext: ProvenanceContext = semanticMetricContext(rootRow);
  const root = register(rootContext);
  if (!root) return null;
  queue.push({ context: root.context, depth: 0, key: root.key });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (expanded.has(current.key)) continue;
    expanded.add(current.key);
    const relations = relationsFor(database, current.context, definitions, findInventoryRow);
    if (current.depth >= maxDepth) {
      if (relations.length > 0) truncated = true;
      continue;
    }
    for (const relation of relations) {
      const target = register(relation.context);
      if (!target) continue;
      const edgeIdentity = `${relation.kind}:${relation.from}:${relation.to}`;
      if (!edgeIdentities.has(edgeIdentity)) {
        edgeIdentities.add(edgeIdentity);
        edges.push({ from: relation.from, kind: relation.kind, to: relation.to });
      }
      if (!expanded.has(target.key)) {
        queue.push({ context: target.context, depth: current.depth + 1, key: target.key });
      }
    }
  }

  return {
    edges,
    maxDepth,
    maxNodes,
    metricKey: safeMetricProvenanceText(input.metricKey) ?? "metric",
    nodes,
    scope: input.scope,
    truncated
  };
}
