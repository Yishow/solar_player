export const METER_MEASUREMENT_KINDS = ["power-gauge", "cumulative-energy", "interval-energy"] as const;
export type MeterMeasurementKind = (typeof METER_MEASUREMENT_KINDS)[number];

export const ENERGY_FLOW_ROLES = ["consumption", "generation", "grid-import", "grid-export"] as const;
export type EnergyFlowRole = (typeof ENERGY_FLOW_ROLES)[number];

export const TIMESTAMP_POLICIES = ["source-required", "allow-receive-time-estimate"] as const;
export type TimestampPolicy = (typeof TIMESTAMP_POLICIES)[number];

export const METER_INGEST_STATUSES = ["accepted", "duplicate", "conflict", "quarantined"] as const;
export type MeterIngestStatus = (typeof METER_INGEST_STATUSES)[number];

export type MeterPhysicalScope = "cl" | "kn";

export const DEFAULT_BOUNDARY_MAX_AGE_SECONDS = 300;

export type MeterSourceDefinition = {
  channelId: string;
  enabled: boolean;
  energyFlowRole: EnergyFlowRole;
  expectedCadenceSeconds: number | null;
  inputUnit: string;
  measurementKind: MeterMeasurementKind;
  meterId: string;
  metricKey: string;
  metricScope: MeterPhysicalScope;
  reviewStatus: "reviewed" | "needs-review";
  scaleDecimal: string;
  sourceRevision: number;
  sourceTimestampTimeZone: string | null;
  timestampPolicy: TimestampPolicy;
  epochId: string;
  boundaryMaxAgeSeconds?: number;
  displayNameZh?: string | null;
  displayNameEn?: string | null;
};

export type MeterReadingSample = {
  dup: boolean | null;
  origin: "mqtt" | "catalog" | "offline";
  qos: number | null;
  rawValueDecimal: string;
  receivedAt: string;
  retain: boolean | null;
  sourceTimestamp: string | null;
  selectorVersion?: number | null;
  sourceTimestampPath?: string | null;
};

export type MeterReadingChangeEvent = {
  identity: string;
  metricScope: MeterPhysicalScope;
  meterId: string;
  channelId: string;
  sourceRevision: number;
  epochId: string;
  readingId: string;
  sourceTimestamp: string | null;
  receivedAt: string;
  late: boolean;
};

export type MeterIngestResult = {
  diagnostics: string[];
  liveValueKwh: string | null;
  liveUpdated?: boolean;
  normalizedValueKwh?: string | null;
  readingId: string | null;
  reason: string | null;
  selectorVersion?: number | null;
  sourceTimestamp?: string | null;
  sourceTimestampPath?: string | null;
  sourceTimestampRaw?: string | null;
  status: MeterIngestStatus;
  timestampQuality: "source" | "receive-time-estimated" | "unknown" | null;
};

const ACCOUNTING_FIELDS = ["meterRole", "departmentId"] as const;
const ENERGY_UNITS = new Set(["wh", "kwh", "mwh"]);
const DECIMAL_SCALE = 9n;
const DECIMAL_FACTOR = 10n ** DECIMAL_SCALE;

export function isMeterMeasurementKind(value: unknown): value is MeterMeasurementKind {
  return typeof value === "string" && METER_MEASUREMENT_KINDS.includes(value as MeterMeasurementKind);
}

export function isEnergyFlowRole(value: unknown): value is EnergyFlowRole {
  return typeof value === "string" && ENERGY_FLOW_ROLES.includes(value as EnergyFlowRole);
}

export function validateMeterSourceWrite(draft: Record<string, unknown>) {
  const reject = (fields: string[], message = "來源設定欄位無效。", code = "E1_SOURCE_INVALID") =>
    ({ ok: false as const, fields, message, code });
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) return reject(["source"]);
  const offending = ACCOUNTING_FIELDS.filter((field) => Object.hasOwn(draft, field));
  if (offending.length) return reject(offending, `E1 不保存會計歸屬欄位：${offending.join(", ")}`, "E1_ACCOUNTING_FIELD_REJECTED");
  const allowed = new Set([
    "channelId", "meterId", "metricKey", "metricScope", "sourceRevision", "epochId", "enabled",
    "reviewStatus", "measurementKind", "energyFlowRole", "inputUnit", "scaleDecimal",
    "sourceTimestampTimeZone", "timestampPolicy", "expectedCadenceSeconds", "boundaryMaxAgeSeconds",
    "displayNameZh", "displayNameEn"
  ]);
  const fields = Object.keys(draft).filter((key) => !allowed.has(key));
  for (const key of ["channelId", "meterId", "metricKey", "epochId"]) {
    const value = draft[key];
    if (typeof value !== "string" || !value.trim() || value.length > 200 || /[\u0000-\u001f]/u.test(value)) fields.push(key);
  }
  if (draft.metricScope !== "cl" && draft.metricScope !== "kn") fields.push("metricScope");
  if (!Number.isSafeInteger(draft.sourceRevision) || Number(draft.sourceRevision) < 1) fields.push("sourceRevision");
  if (typeof draft.enabled !== "boolean") fields.push("enabled");
  if (draft.reviewStatus !== "reviewed" && draft.reviewStatus !== "needs-review") fields.push("reviewStatus");
  if (!isMeterMeasurementKind(draft.measurementKind)) fields.push("measurementKind");
  if (!isEnergyFlowRole(draft.energyFlowRole)) fields.push("energyFlowRole");
  const units = draft.measurementKind === "power-gauge" ? ["w", "kw", "mw"] : ["wh", "kwh", "mwh"];
  if (typeof draft.inputUnit !== "string" || !units.includes(draft.inputUnit.trim().toLowerCase())) fields.push("inputUnit");
  try {
    if (typeof draft.scaleDecimal !== "string" || draft.scaleDecimal.length > 100 || parseDecimalString(draft.scaleDecimal) <= 0n) fields.push("scaleDecimal");
  } catch { fields.push("scaleDecimal"); }
  if (draft.sourceTimestampTimeZone !== null) {
    try {
      if (typeof draft.sourceTimestampTimeZone !== "string" || !draft.sourceTimestampTimeZone) throw new Error();
      new Intl.DateTimeFormat("en", { timeZone: draft.sourceTimestampTimeZone });
    } catch { fields.push("sourceTimestampTimeZone"); }
  }
  if (!TIMESTAMP_POLICIES.includes(draft.timestampPolicy as TimestampPolicy)
    || (draft.timestampPolicy === "allow-receive-time-estimate" && draft.reviewStatus !== "reviewed")) fields.push("timestampPolicy");
  if (draft.expectedCadenceSeconds !== null && (!Number.isSafeInteger(draft.expectedCadenceSeconds) || Number(draft.expectedCadenceSeconds) <= 0)) fields.push("expectedCadenceSeconds");
  if (draft.boundaryMaxAgeSeconds !== undefined
    && (!Number.isSafeInteger(draft.boundaryMaxAgeSeconds) || Number(draft.boundaryMaxAgeSeconds) <= 0)) fields.push("boundaryMaxAgeSeconds");
  for (const key of ["displayNameZh", "displayNameEn"]) {
    if (draft[key] !== undefined && draft[key] !== null && (typeof draft[key] !== "string" || String(draft[key]).length > 200)) fields.push(key);
  }
  return fields.length ? reject([...new Set(fields)]) : { ok: true as const };
}

export function parseDecimalString(value: string): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("INVALID_DECIMAL");
  }
  const negative = trimmed.startsWith("-");
  const [whole = "0", fraction = ""] = (negative ? trimmed.slice(1) : trimmed).split(".");
  const padded = (fraction + "0".repeat(Number(DECIMAL_SCALE))).slice(0, Number(DECIMAL_SCALE));
  const scaled = BigInt(whole) * DECIMAL_FACTOR + BigInt(padded || "0");
  return negative ? -scaled : scaled;
}

export function formatDecimalString(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / DECIMAL_FACTOR;
  let fraction = (abs % DECIMAL_FACTOR).toString().padStart(Number(DECIMAL_SCALE), "0");
  fraction = fraction.replace(/0+$/, "");
  const body = fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
  return negative ? `-${body}` : body;
}

export function subtractDecimalString(left: string, right: string): string {
  return formatDecimalString(parseDecimalString(left) - parseDecimalString(right));
}

/** Applies a reviewed source scale without changing its unit. */
export function applyMeterScaleDecimal(rawValueDecimal: string, scaleDecimal = "1"): string {
  return formatDecimalString(parseDecimalString(rawValueDecimal) * parseDecimalString(scaleDecimal) / DECIMAL_FACTOR);
}

export function normalizeEnergyToKwhDecimal(rawValueDecimal: string, inputUnit: string, scaleDecimal = "1"): string {
  const unit = inputUnit.trim().toLowerCase();
  if (!ENERGY_UNITS.has(unit)) {
    throw Object.assign(new Error("UNSUPPORTED_UNIT"), { field: "inputUnit", unit: inputUnit });
  }
  const scaled = parseDecimalString(rawValueDecimal) * parseDecimalString(scaleDecimal) / DECIMAL_FACTOR;
  if (unit === "kwh") {
    return formatDecimalString(scaled);
  }
  if (unit === "wh") {
    return formatDecimalString(scaled / 1000n);
  }
  return formatDecimalString(scaled * 1000n);
}

export function meterIdentityKey(definition: Pick<MeterSourceDefinition, "metricScope" | "meterId" | "channelId" | "sourceRevision" | "epochId">) {
  return `${definition.metricScope}:${definition.meterId}:${definition.channelId}:r${definition.sourceRevision}:${definition.epochId}`;
}

export function physicalIdentityChanged(
  previous: Pick<MeterSourceDefinition, "meterId" | "measurementKind" | "energyFlowRole" | "inputUnit" | "scaleDecimal" | "sourceTimestampTimeZone" | "timestampPolicy">,
  next: typeof previous
) {
  return previous.meterId !== next.meterId
    || previous.measurementKind !== next.measurementKind
    || previous.energyFlowRole !== next.energyFlowRole
    || previous.inputUnit !== next.inputUnit
    || previous.scaleDecimal !== next.scaleDecimal
    || previous.sourceTimestampTimeZone !== next.sourceTimestampTimeZone
    || previous.timestampPolicy !== next.timestampPolicy;
}

function hasExplicitOffset(timestamp: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp);
}

function formatZonedLocal(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date(utcMs));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${read("year")}-${read("month")}-${read("day")}T${hour}:${read("minute")}:${read("second")}`;
}

export function parseSourceTimestamp(timestamp: string | null, sourceTimestampTimeZone: string | null): {
  instant: string | null;
  reason: string | null;
} {
  if (!timestamp) {
    return { instant: null, reason: null };
  }
  if (hasExplicitOffset(timestamp)) {
    const civil = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
    if (!civil) return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
    const [, year, month, day, hour, minute, second] = civil;
    const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== `${year}-${month}-${day}`
      || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
      return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
    }
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) {
      return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
    }
    return { instant: new Date(parsed).toISOString().replace(/\.000Z$/, "Z"), reason: null };
  }
  if (!sourceTimestampTimeZone) {
    return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
  }
  try {
    Intl.DateTimeFormat("en-US", { timeZone: sourceTimestampTimeZone });
  } catch {
    return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
  }
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
  }
  const [, year, month, day, hour, minute, second] = match;
  const asUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const matches: number[] = [];
  for (let offsetMinutes = -14 * 60; offsetMinutes <= 14 * 60; offsetMinutes += 15) {
    const candidate = asUtc - offsetMinutes * 60_000;
    if (formatZonedLocal(candidate, sourceTimestampTimeZone) === timestamp && !matches.includes(candidate)) {
      matches.push(candidate);
    }
  }
  if (matches.length !== 1) {
    return { instant: null, reason: "SOURCE_TIMESTAMP_INVALID" };
  }
  return { instant: new Date(matches[0]!).toISOString().replace(/\.000Z$/, "Z"), reason: null };
}

export function admitMeterReading(
  definition: MeterSourceDefinition,
  sample: MeterReadingSample
): MeterIngestResult {
  if (sample.origin === "catalog" || sample.origin === "offline") {
    return {
      diagnostics: ["CATALOG_OR_OFFLINE_NOT_INGESTED"],
      liveValueKwh: null,
      readingId: null,
      reason: "CATALOG_OR_OFFLINE_NOT_INGESTED",
      status: "quarantined",
      timestampQuality: null
    };
  }

  const parsed = parseSourceTimestamp(sample.sourceTimestamp, definition.sourceTimestampTimeZone);
  const trustworthySourceTime = parsed.instant;
  const missingTransport = sample.retain === null || sample.dup === null || sample.qos === null;

  if (sample.retain === true && !trustworthySourceTime) {
    return {
      diagnostics: parsed.reason ? ["RETAINED_SOURCE_TIME_UNKNOWN", parsed.reason] : ["RETAINED_SOURCE_TIME_UNKNOWN"],
      liveValueKwh: null,
      readingId: null,
      reason: "RETAINED_SOURCE_TIME_UNKNOWN",
      status: "quarantined",
      timestampQuality: "unknown"
    };
  }

  if (missingTransport && !trustworthySourceTime) {
    return {
      diagnostics: ["TRANSPORT_EVIDENCE_MISSING"],
      liveValueKwh: null,
      readingId: null,
      reason: "TRANSPORT_EVIDENCE_MISSING",
      status: "quarantined",
      timestampQuality: "unknown"
    };
  }

  if (parsed.reason) {
    return {
      diagnostics: [parsed.reason],
      liveValueKwh: null,
      readingId: null,
      reason: parsed.reason,
      status: "quarantined",
      timestampQuality: "unknown"
    };
  }

  if (!trustworthySourceTime) {
    if (sample.dup === true) {
      return {
        diagnostics: ["DUPLICATE_SOURCE_TIME_UNKNOWN"],
        liveValueKwh: null,
        readingId: null,
        reason: "DUPLICATE_SOURCE_TIME_UNKNOWN",
        status: "quarantined",
        timestampQuality: "unknown"
      };
    }
    const canEstimate = definition.timestampPolicy === "allow-receive-time-estimate"
      && sample.retain === false
      && sample.dup === false
      && sample.qos !== null
      && [0, 1, 2].includes(sample.qos);
    if (!canEstimate) {
      return {
        diagnostics: ["SOURCE_TIMESTAMP_REQUIRED"],
        liveValueKwh: null,
        readingId: null,
        reason: "SOURCE_TIMESTAMP_REQUIRED",
        status: "quarantined",
        timestampQuality: "unknown"
      };
    }
    return {
      diagnostics: [],
      liveValueKwh: null,
      readingId: null,
      reason: null,
      status: "accepted",
      timestampQuality: "receive-time-estimated"
    };
  }

  return {
    diagnostics: [],
    liveValueKwh: null,
    readingId: null,
    reason: null,
    status: "accepted",
    timestampQuality: "source"
  };
}

export function isRegisteredConsumptionPowerChannel(metricKey: string, catalog: readonly MeterSourceDefinition[] = []) {
  if (catalog.length > 0) {
    return catalog.some((source) =>
      source.enabled
      && source.reviewStatus === "reviewed"
      && source.metricKey === metricKey
      && source.measurementKind === "power-gauge"
      && source.energyFlowRole === "consumption"
    );
  }
  return metricKey === "factoryProductionPower"
    || metricKey === "factoryHvacPower"
    || metricKey === "factoryLightingPower";
}

export function inventoryLegacyMapping(metricKey: string, unit: string | null): {
  preserved: true;
  reviewStatus: "reviewed" | "needs-review";
} {
  if (metricKey.startsWith("factoryGeneration.")) {
    return { preserved: true, reviewStatus: "needs-review" };
  }
  if (metricKey === "consumptionEnergy" && (unit ?? "").toLowerCase() === "kwh") {
    return { preserved: true, reviewStatus: "needs-review" };
  }
  return { preserved: true, reviewStatus: "needs-review" };
}
