import type Database from "better-sqlite3";
import type { MetricScope } from "@solar-display/shared";
import type { ManagedSourceAdapter } from "./ManagedSourceAdapter.js";

export const SOLAR_SOURCE_SUBSCRIPTION_FILTERS = [
  "solar/+/summary",
  "solar/+/zone/+",
  "solar/+/status",
  "solar/+/heartbeat",
  "solar/+/alert"
] as const;

export function isSolarAdapterManagedMetricIdentity(
  metricScope: MetricScope,
  metricKey: string
) {
  return metricScope !== "global"
    && (
      metricKey.startsWith("factoryGeneration.")
      || metricKey.startsWith("solarZone.")
    );
}

type SolarSourceContractErrorCode =
  | "invalid-json"
  | "invalid-metric"
  | "invalid-timestamp"
  | "invalid-zone"
  | "site-mismatch"
  | "unsupported-site"
  | "unsupported-topic";

type SolarSourceHealth = "healthy" | "stale" | "unhealthy" | "unknown";

export type SolarSourceContractDiagnostic = {
  code: SolarSourceContractErrorCode;
  message: string;
  observedAt: string;
  sourceTopic: string;
};

export type SolarSourceDiagnostic = {
  discoveredZoneCount: number;
  health: SolarSourceHealth;
  lastAlert: string | null;
  lastError: SolarSourceContractDiagnostic | null;
  lastGoodSummaryAt: string | null;
  lastHeartbeatAt: string | null;
  lastStatus: string | null;
  metricScope: MetricScope;
  ownership: "managed";
  sourceId: "solar-collector";
  sourceTimestamp: string | null;
  sourceTopic: string;
};

type SolarSourceState = Omit<
  SolarSourceDiagnostic,
  | "discoveredZoneCount"
  | "health"
  | "metricScope"
  | "ownership"
  | "sourceId"
  | "sourceTimestamp"
  | "sourceTopic"
>;

type SolarMetricReading = {
  metricKey: string;
  unit: string;
  value: number;
};

export type SolarDiscoveredZone = {
  displayName: string | null;
  lastObservedFields: string[];
  metricScope: MetricScope;
  sourceTimestamp: string;
  sourceTopic: string;
  zoneId: string;
};

const zoneMetricDefinitions = [
  { field: "power_kw", suffix: "powerKw", unit: "kW" },
  { field: "today_kwh", suffix: "todayKwh", unit: "kWh" },
  { field: "month_mwh", suffix: "monthMwh", unit: "MWh" },
  { field: "total_mwh", suffix: "totalMwh", unit: "MWh" },
  { field: "capacity_kwp", suffix: "capacityKwp", unit: "kWp" },
  { field: "today_hours", suffix: "todayHours", unit: "h" }
] as const;

export type SolarMetricMessage = {
  kind: "metrics";
  metricScope: MetricScope;
  payload: Record<string, unknown>;
  readings: SolarMetricReading[];
  sourceTimestamp: string;
  sourceTopic: string;
  sourceType: "summary" | "zone";
  zone?: {
    displayName: string | null;
    zoneId: string;
  };
};

type SolarDiagnosticMessage = {
  kind: "diagnostic";
  metricScope: MetricScope;
  payload: Record<string, unknown>;
  sourceTopic: string;
  sourceType: "alert" | "heartbeat" | "status";
};

export type SolarCollectorMessage = SolarDiagnosticMessage | SolarMetricMessage;

export class SolarSourceContractError extends Error {
  constructor(
    readonly code: SolarSourceContractErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SolarSourceContractError";
  }
}

function parsePayload(rawPayload: string) {
  try {
    const payload = JSON.parse(rawPayload) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new SolarSourceContractError("invalid-json", "Solar payload must be an object");
    }
    return payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SolarSourceContractError) {
      throw error;
    }
    throw new SolarSourceContractError("invalid-json", "Solar payload is not valid JSON");
  }
}

function resolveMetricScope(site: string): MetricScope {
  if (site === "CL") return "cl";
  if (site === "KN") return "kn";
  throw new SolarSourceContractError("unsupported-site", `Unsupported Solar site: ${site}`);
}

function assertPayloadSite(payload: Record<string, unknown>, site: string) {
  if (payload.factory === undefined) {
    return;
  }
  if (typeof payload.factory !== "string" || payload.factory.toUpperCase() !== site) {
    throw new SolarSourceContractError(
      "site-mismatch",
      `Solar payload factory does not match topic site ${site}`
    );
  }
}

function readSourceTimestamp(payload: Record<string, unknown>) {
  if (typeof payload.timestamp !== "string" || !Number.isFinite(Date.parse(payload.timestamp))) {
    throw new SolarSourceContractError(
      "invalid-timestamp",
      "Solar payload timestamp must be a parseable string"
    );
  }
  return payload.timestamp;
}

function requiredFiniteMetric(
  payload: Record<string, unknown>,
  field: string,
  metricKey: string,
  unit: string
): SolarMetricReading {
  const value = payload[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SolarSourceContractError("invalid-metric", `Solar field ${field} must be finite`);
  }
  return { metricKey, unit, value };
}

function optionalFiniteMetric(
  payload: Record<string, unknown>,
  field: string,
  metricKey: string,
  unit: string
) {
  const value = payload[field];
  return typeof value === "number" && Number.isFinite(value)
    ? { metricKey, unit, value }
    : null;
}

function parseSummary(
  metricScope: MetricScope,
  payload: Record<string, unknown>,
  sourceTopic: string
): SolarMetricMessage {
  const readings = [
    requiredFiniteMetric(payload, "total_power_kw", "factoryGeneration.powerKw", "kW"),
    requiredFiniteMetric(payload, "today_mwh", "factoryGeneration.todayMwh", "MWh"),
    requiredFiniteMetric(payload, "month_mwh", "factoryGeneration.monthMwh", "MWh"),
    optionalFiniteMetric(payload, "total_mwh", "factoryGeneration.totalMwh", "MWh")
  ].filter((reading): reading is SolarMetricReading => reading !== null);

  return {
    kind: "metrics",
    metricScope,
    payload,
    readings,
    sourceTimestamp: readSourceTimestamp(payload),
    sourceTopic,
    sourceType: "summary"
  };
}

function normalizeZoneId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new SolarSourceContractError("invalid-zone", "Solar zone id must be stable text or number");
  }
  const zoneId = String(value).trim();
  if (!/^[A-Za-z0-9_-]+$/.test(zoneId)) {
    throw new SolarSourceContractError("invalid-zone", "Solar zone id contains unsupported characters");
  }
  return zoneId;
}

function parseZone(
  metricScope: MetricScope,
  payload: Record<string, unknown>,
  sourceTopic: string,
  topicZoneId: string
): SolarMetricMessage {
  const zoneId = normalizeZoneId(topicZoneId);
  if (payload.zone_id !== undefined && normalizeZoneId(payload.zone_id) !== zoneId) {
    throw new SolarSourceContractError("invalid-zone", "Solar payload zone id does not match topic");
  }
  const readings = zoneMetricDefinitions
    .map(({ field, suffix, unit }) =>
      optionalFiniteMetric(payload, field, `solarZone.${zoneId}.${suffix}`, unit)
    )
    .filter((reading): reading is SolarMetricReading => reading !== null);

  return {
    kind: "metrics",
    metricScope,
    payload,
    readings,
    sourceTimestamp: readSourceTimestamp(payload),
    sourceTopic,
    sourceType: "zone",
    zone: {
      displayName: typeof payload.name === "string" ? payload.name.trim() || null : null,
      zoneId
    }
  };
}

export function parseSolarCollectorMessage(
  sourceTopic: string,
  rawPayload: string
): SolarCollectorMessage {
  const topicParts = sourceTopic.split("/");
  if (topicParts[0] !== "solar" || topicParts.length < 3) {
    throw new SolarSourceContractError("unsupported-topic", `Unsupported Solar topic: ${sourceTopic}`);
  }
  const site = topicParts[1] ?? "";
  const metricScope = resolveMetricScope(site);
  const payload = parsePayload(rawPayload);
  assertPayloadSite(payload, site);

  if (topicParts.length === 3 && topicParts[2] === "summary") {
    return parseSummary(metricScope, payload, sourceTopic);
  }
  if (topicParts.length === 4 && topicParts[2] === "zone") {
    return parseZone(metricScope, payload, sourceTopic, topicParts[3] ?? "");
  }
  if (
    topicParts.length === 3
    && (topicParts[2] === "status" || topicParts[2] === "heartbeat" || topicParts[2] === "alert")
  ) {
    return {
      kind: "diagnostic",
      metricScope,
      payload,
      sourceTopic,
      sourceType: topicParts[2]
    };
  }
  throw new SolarSourceContractError("unsupported-topic", `Unsupported Solar topic: ${sourceTopic}`);
}

type SolarSourceAdapterOptions = {
  database: Database.Database;
  healthTimeoutMs?: number;
  now?: () => Date;
  onMetricsPersisted?: (message: SolarMetricMessage) => Promise<void> | void;
};

export class SolarSourceAdapter implements ManagedSourceAdapter {
  readonly subscriptionFilters = SOLAR_SOURCE_SUBSCRIPTION_FILTERS;
  private readonly database: Database.Database;
  private readonly discoveredZones = new Map<string, SolarDiscoveredZone>();
  private readonly healthTimeoutMs: number;
  private readonly now: () => Date;
  private readonly onMetricsPersisted: SolarSourceAdapterOptions["onMetricsPersisted"];
  private readonly recentContractErrors: SolarSourceContractDiagnostic[] = [];
  private readonly sourceStates = new Map<MetricScope, SolarSourceState>();

  constructor(options: SolarSourceAdapterOptions) {
    this.database = options.database;
    this.healthTimeoutMs =
      typeof options.healthTimeoutMs === "number"
      && Number.isFinite(options.healthTimeoutMs)
      && options.healthTimeoutMs > 0
        ? options.healthTimeoutMs
        : 60_000;
    this.now = options.now ?? (() => new Date());
    this.onMetricsPersisted = options.onMetricsPersisted;
    for (const metricScope of ["cl", "kn"] as const) {
      this.sourceStates.set(metricScope, {
        lastAlert: null,
        lastError: null,
        lastGoodSummaryAt: null,
        lastHeartbeatAt: null,
        lastStatus: null
      });
    }
  }

  async handleMessage(sourceTopic: string, rawPayload: string) {
    let message: SolarCollectorMessage;
    try {
      message = parseSolarCollectorMessage(sourceTopic, rawPayload);
    } catch (error) {
      if (error instanceof SolarSourceContractError) {
        const diagnostic = {
          code: error.code,
          message: error.message.slice(0, 500),
          observedAt: this.now().toISOString(),
          sourceTopic: sourceTopic.slice(0, 500)
        };
        this.recentContractErrors.push(diagnostic);
        this.recentContractErrors.splice(0, Math.max(0, this.recentContractErrors.length - 20));
        const site = sourceTopic.split("/")[1];
        if (site === "CL" || site === "KN") {
          this.sourceStates.get(site === "CL" ? "cl" : "kn")!.lastError = diagnostic;
        }
      }
      throw error;
    }
    if (message.kind !== "metrics") {
      this.recordDiagnosticMessage(message);
      return;
    }

    const provenance = JSON.stringify({
      ...message.payload,
      sourceTopic: message.sourceTopic,
      sourceType: message.sourceType
    });
    const upsert = this.database.prepare(`
      INSERT INTO live_metric_values (
        metric_scope,
        metric_key,
        value,
        unit,
        timestamp,
        quality,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, 'good', ?)
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        value = excluded.value,
        unit = excluded.unit,
        timestamp = excluded.timestamp,
        quality = excluded.quality,
        raw_payload = excluded.raw_payload
    `);
    this.database.transaction(() => {
      for (const reading of message.readings) {
        upsert.run(
          message.metricScope,
          reading.metricKey,
          reading.value,
          reading.unit,
          message.sourceTimestamp,
          provenance
        );
      }
    })();

    if (message.sourceType === "zone" && message.zone) {
      const zoneIdentity = `${message.metricScope}:${message.zone.zoneId}`;
      const previousZone = this.discoveredZones.get(zoneIdentity);
      this.discoveredZones.set(zoneIdentity, {
        displayName: message.zone.displayName ?? previousZone?.displayName ?? null,
        lastObservedFields: zoneMetricDefinitions
          .map(({ field }) => field)
          .filter((field) => {
            const value = message.payload[field];
            return typeof value === "number" && Number.isFinite(value);
          })
          .sort(),
        metricScope: message.metricScope,
        sourceTimestamp: message.sourceTimestamp,
        sourceTopic: message.sourceTopic,
        zoneId: message.zone.zoneId
      });
    }
    if (message.sourceType === "summary") {
      this.sourceStates.get(message.metricScope)!.lastGoodSummaryAt = message.sourceTimestamp;
    }
    await this.onMetricsPersisted?.(message);
  }

  readDiscoveredZones() {
    return [...this.discoveredZones.values()]
      .sort((left, right) =>
        left.metricScope.localeCompare(right.metricScope)
        || left.zoneId.localeCompare(right.zoneId)
      )
      .map((zone) => ({
        ...zone,
        lastObservedFields: [...zone.lastObservedFields]
      }));
  }

  readContractErrors() {
    return this.recentContractErrors.map((error) => ({ ...error }));
  }

  readSourceDiagnostics(): SolarSourceDiagnostic[] {
    const nowMs = this.now().getTime();
    return (["cl", "kn"] as const).map((metricScope) => {
      const state = this.sourceStates.get(metricScope)!;
      let health: SolarSourceHealth = "unknown";
      if (state.lastStatus && ["error", "offline", "unhealthy"].includes(state.lastStatus.toLowerCase())) {
        health = "unhealthy";
      } else if (state.lastHeartbeatAt) {
        health = nowMs - Date.parse(state.lastHeartbeatAt) > this.healthTimeoutMs
          ? "stale"
          : "healthy";
      }
      return {
        discoveredZoneCount: [...this.discoveredZones.values()].filter(
          (zone) => zone.metricScope === metricScope
        ).length,
        health,
        lastAlert: state.lastAlert,
        lastError: state.lastError ? { ...state.lastError } : null,
        lastGoodSummaryAt: state.lastGoodSummaryAt,
        lastHeartbeatAt: state.lastHeartbeatAt,
        lastStatus: state.lastStatus,
        metricScope,
        ownership: "managed",
        sourceId: "solar-collector",
        sourceTimestamp: state.lastGoodSummaryAt,
        sourceTopic: `solar/${metricScope.toUpperCase()}/summary`
      };
    });
  }

  private recordDiagnosticMessage(message: SolarDiagnosticMessage) {
    const state = this.sourceStates.get(message.metricScope)!;
    if (message.sourceType === "heartbeat") {
      state.lastHeartbeatAt = this.now().toISOString();
      return;
    }
    if (message.sourceType === "status") {
      state.lastStatus = typeof message.payload.status === "string"
        ? message.payload.status.trim().slice(0, 200) || null
        : null;
      return;
    }
    const alert = [message.payload.message, message.payload.event, message.payload.code]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    state.lastAlert = alert?.trim().slice(0, 500) ?? "alert";
  }
}
