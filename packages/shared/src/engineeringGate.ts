import {
  KN_ENGINEERING_IDS,
  isKnEngineeringId,
  type KnEngineeringId,
  type KnEngineeringMode,
  type EngineeringSourceDefinition
} from "./engineeringSources.js";
import { isTaipeiLocalDayInterval } from "./engineeringPeriodResults.js";

export interface StrictJsonParseResult {
  valid: boolean;
  data?: any;
  error?: string;
}

function getUtf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export function parseStrictJson(raw: string): StrictJsonParseResult {
  if (typeof raw !== "string") {
    return { valid: false, error: "Input must be a string" };
  }
  const byteLen = getUtf8ByteLength(raw);
  if (byteLen > 64 * 1024) {
    return { valid: false, error: `Payload exceeds 64 KiB limit (got ${byteLen} bytes)` };
  }

  // Check duplicate keys and max depth via state machine
  let depth = 0;
  let maxDepthSeen = 0;
  const keyStacks: Array<Set<string>> = [];
  let inString = false;
  let escape = false;
  let currentString = "";
  let expectingKey = false;
  let topLevelKeyCount = 0;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) {
        escape = false;
        currentString += ch;
      } else if (ch === "\\") {
        escape = true;
        currentString += ch;
      } else if (ch === '"') {
        inString = false;
        if (expectingKey) {
          const currentScope = keyStacks[keyStacks.length - 1];
          if (currentScope) {
            if (currentScope.has(currentString)) {
              return { valid: false, error: `Duplicate JSON key detected: "${currentString}"` };
            }
            currentScope.add(currentString);
            if (keyStacks.length === 1) {
              topLevelKeyCount++;
              if (topLevelKeyCount > 64) {
                return { valid: false, error: "Exceeded maximum 64 top-level fields" };
              }
            }
          }
          expectingKey = false;
        }
      } else {
        currentString += ch;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      currentString = "";
      continue;
    }

    if (ch === "{" || ch === "[") {
      depth++;
      if (depth > maxDepthSeen) maxDepthSeen = depth;
      if (depth > 8) {
        return { valid: false, error: `JSON depth exceeds limit of 8 (reached depth ${depth})` };
      }
      if (ch === "{") {
        keyStacks.push(new Set<string>());
        expectingKey = true;
      }
    } else if (ch === "}" || ch === "]") {
      depth--;
      if (ch === "}") {
        keyStacks.pop();
      }
      expectingKey = false;
    } else if (ch === ",") {
      if (keyStacks.length > 0) {
        expectingKey = true;
      }
    }
  }

  try {
    const data = JSON.parse(raw);
    return { valid: true, data };
  } catch (err: any) {
    return { valid: false, error: `Malformed JSON: ${err.message}` };
  }
}

export interface EngineeringPacketHeader {
  schemaVersion: number;
  sourceKind: "engineering";
  site: "kn";
  engineeringId: KnEngineeringId;
  publisherId: string;
  definitionRevision: number;
  calendarRevision?: number;
  unit: "kW" | "kWh";
  exampleOnly?: boolean;
}

export interface EngineeringPowerPacket extends EngineeringPacketHeader {
  measurementKind: "power-gauge";
  unit: "kW";
  value: string | number;
  observedAt: string;
  quality: "valid" | "partial" | "invalid" | "unknown";
  sampleId?: string;
}

export interface EngineeringDailyPacket extends EngineeringPacketHeader {
  measurementKind: "interval-energy";
  unit: "kWh";
  value: string | number | null;
  periodStart: string;
  periodEnd: string;
  periodStatus: "preliminary" | "final" | "withdrawn";
  coverage: "complete" | "partial" | "unknown";
  quality: "valid" | "partial" | "invalid" | "unknown";
  dataRevision: number;
  publishedAt: string;
  reason?: string | null;
}

export interface EngineeringCumulativePacket extends EngineeringPacketHeader {
  measurementKind: "cumulative-energy";
  unit: "kWh";
  value: string | number;
  observedAt: string;
  counterEpoch: string;
  quality: "valid" | "partial" | "invalid" | "unknown";
  sampleId?: string;
}

export type EngineeringPacket =
  | EngineeringPowerPacket
  | EngineeringDailyPacket
  | EngineeringCumulativePacket;

export interface GateValidationOptions {
  isProduction: boolean;
  expectedRegistration?: EngineeringSourceDefinition;
  expectedTopic?: string;
}

export interface GateValidationResult {
  accepted: boolean;
  packet?: EngineeringPacket;
  rejectionReason?: string;
  rejectionCode?:
    | "INVALID_JSON"
    | "SCHEMA_MISMATCH"
    | "UNKNOWN_ENGINEERING"
    | "MODE_MISMATCH"
    | "UNIT_MISMATCH"
    | "PUBLISHER_UNAPPROVED"
    | "EXAMPLE_ONLY_IN_PRODUCTION"
    | "MISSING_OBSERVED_AT"
    | "INVALID_PERIOD"
    | "INVALID_VALUE"
    | "REASON_REQUIRED"
    | "REGISTRATION_REQUIRED";
}

function isExplicitTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) {
    return false;
  }
  const [, year, month, day, hour, minute, second] = match;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number(month) >= 1
    && Number(month) <= 12
    && Number(day) === calendarDate.getUTCDate()
    && Number(hour) >= 0
    && Number(hour) <= 23
    && Number(minute) >= 0
    && Number(minute) <= 59
    && Number(second) >= 0
    && Number(second) <= 59;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeDecimal(value: unknown): value is string | number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0;
  }
  return typeof value === "string"
    && /^\d+(?:\.\d+)?$/u.test(value)
    && Number.isFinite(Number(value));
}

function validateRegistration(
  parsed: Record<string, any>,
  measurementKind: EngineeringPacket["measurementKind"],
  options: GateValidationOptions
): GateValidationResult | null {
  const expected = options.expectedRegistration;
  if (!expected) {
    return options.isProduction
      ? {
          accepted: false,
          rejectionReason: "Engineering packet has no approved enabled registration",
          rejectionCode: "REGISTRATION_REQUIRED"
        }
      : null;
  }

  if (
    !expected.enabled
    || expected.mode === "unconfigured"
    || expected.reviewStatus !== "approved"
    || typeof expected.approvedPublisherId !== "string"
    || expected.approvedPublisherId.trim() === ""
    || typeof expected.exactTopic !== "string"
    || expected.exactTopic.trim() === ""
  ) {
    return {
      accepted: false,
      rejectionReason: "Engineering packet registration is not approved and enabled",
      rejectionCode: "REGISTRATION_REQUIRED"
    };
  }

  if (expected.engineeringId !== parsed.engineeringId) {
    return {
      accepted: false,
      rejectionReason: `Engineering ID mismatch: expected ${expected.engineeringId}, got ${parsed.engineeringId}`,
      rejectionCode: "UNKNOWN_ENGINEERING"
    };
  }

  if (parsed.publisherId !== expected.approvedPublisherId) {
    return {
      accepted: false,
      rejectionReason: `Publisher "${parsed.publisherId}" not approved for this source`,
      rejectionCode: "PUBLISHER_UNAPPROVED"
    };
  }

  if (parsed.definitionRevision !== expected.definitionRevision) {
    return {
      accepted: false,
      rejectionReason: `Definition revision ${parsed.definitionRevision} does not match registered revision ${expected.definitionRevision}`,
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (
    expected.calendarRevision === null
    || parsed.calendarRevision !== expected.calendarRevision
  ) {
    return {
      accepted: false,
      rejectionReason: `Calendar revision ${parsed.calendarRevision} does not match registered revision ${expected.calendarRevision}`,
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  const expectedMode = measurementKind === "power-gauge"
    ? "power-gauge"
    : measurementKind === "interval-energy"
      ? "daily-report"
      : "cumulative-energy";
  if (expected.mode !== expectedMode) {
    return {
      accepted: false,
      rejectionReason: `Measurement kind "${measurementKind}" does not match registered mode "${expected.mode}"`,
      rejectionCode: "MODE_MISMATCH"
    };
  }

  const expectedUnit = measurementKind === "power-gauge" ? "kW" : "kWh";
  if (expected.unit !== expectedUnit) {
    return {
      accepted: false,
      rejectionReason: `Registered unit "${expected.unit}" does not match mode "${expected.mode}"`,
      rejectionCode: "UNIT_MISMATCH"
    };
  }

  if (options.expectedTopic !== undefined && options.expectedTopic !== expected.exactTopic) {
    return {
      accepted: false,
      rejectionReason: `Topic "${options.expectedTopic}" does not match registered exact topic "${expected.exactTopic}"`,
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  return null;
}

export function validateEngineeringPacket(
  rawPayload: string | Record<string, any>,
  options: GateValidationOptions
): GateValidationResult {
  let parsed: any;
  if (typeof rawPayload === "string") {
    const jsonRes = parseStrictJson(rawPayload);
    if (!jsonRes.valid) {
      return { accepted: false, rejectionReason: jsonRes.error, rejectionCode: "INVALID_JSON" };
    }
    parsed = jsonRes.data;
  } else {
    parsed = rawPayload;
  }

  if (!parsed || typeof parsed !== "object") {
    return { accepted: false, rejectionReason: "Payload must be a JSON object", rejectionCode: "SCHEMA_MISMATCH" };
  }

  if (parsed.sourceKind !== "engineering") {
    return {
      accepted: false,
      rejectionReason: `Expected sourceKind "engineering", got "${parsed.sourceKind}"`,
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (parsed.site !== "kn") {
    return {
      accepted: false,
      rejectionReason: `Expected site "kn", got "${parsed.site}"`,
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (!isKnEngineeringId(parsed.engineeringId)) {
    return {
      accepted: false,
      rejectionReason: `Unknown engineering identity "${parsed.engineeringId}"`,
      rejectionCode: "UNKNOWN_ENGINEERING"
    };
  }

  if (parsed.schemaVersion !== 1) {
    return {
      accepted: false,
      rejectionReason: `Expected schemaVersion 1, got "${parsed.schemaVersion}"`,
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (typeof parsed.publisherId !== "string" || parsed.publisherId.trim() === "") {
    return {
      accepted: false,
      rejectionReason: "publisherId is required and must be a non-empty string",
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (!isPositiveInteger(parsed.definitionRevision)) {
    return {
      accepted: false,
      rejectionReason: "definitionRevision must be a positive integer",
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (parsed.calendarRevision !== undefined && !isPositiveInteger(parsed.calendarRevision)) {
    return {
      accepted: false,
      rejectionReason: "calendarRevision must be a positive integer when provided",
      rejectionCode: "SCHEMA_MISMATCH"
    };
  }

  if (options.isProduction && parsed.exampleOnly === true) {
    return {
      accepted: false,
      rejectionReason: "exampleOnly data is forbidden in production admission",
      rejectionCode: "EXAMPLE_ONLY_IN_PRODUCTION"
    };
  }

  const kind = parsed.measurementKind;
  if (kind === "power-gauge") {
    if (parsed.unit !== "kW") {
      return { accepted: false, rejectionReason: `power-gauge requires unit "kW", got "${parsed.unit}"`, rejectionCode: "UNIT_MISMATCH" };
    }
    if (!isExplicitTimestamp(parsed.observedAt)) {
      return { accepted: false, rejectionReason: "power-gauge requires valid ISO observedAt", rejectionCode: "MISSING_OBSERVED_AT" };
    }
    if (!isNonNegativeDecimal(parsed.value)) {
      return { accepted: false, rejectionReason: "power-gauge requires non-negative numeric value", rejectionCode: "INVALID_VALUE" };
    }
    if (!["valid", "partial", "invalid", "unknown"].includes(parsed.quality)) {
      return { accepted: false, rejectionReason: "power-gauge requires an explicit quality", rejectionCode: "SCHEMA_MISMATCH" };
    }
    const registrationError = validateRegistration(parsed, kind, options);
    return registrationError ?? { accepted: true, packet: parsed as EngineeringPowerPacket };
  }

  if (kind === "interval-energy") {
    if (parsed.unit !== "kWh") {
      return { accepted: false, rejectionReason: `interval-energy requires unit "kWh", got "${parsed.unit}"`, rejectionCode: "UNIT_MISMATCH" };
    }
    if (!parsed.periodStart || !parsed.periodEnd) {
      return { accepted: false, rejectionReason: "periodStart and periodEnd are required", rejectionCode: "INVALID_PERIOD" };
    }
    if (!isExplicitTimestamp(parsed.periodStart) || !isExplicitTimestamp(parsed.periodEnd)) {
      return { accepted: false, rejectionReason: "periodEnd must be strictly after periodStart", rejectionCode: "INVALID_PERIOD" };
    }
    if (!isTaipeiLocalDayInterval(parsed.periodStart, parsed.periodEnd)) {
      return { accepted: false, rejectionReason: "daily-report period must span exactly one day on Taipei local boundaries", rejectionCode: "INVALID_PERIOD" };
    }
    if (!["preliminary", "final", "withdrawn"].includes(parsed.periodStatus)) {
      return { accepted: false, rejectionReason: "periodStatus must be preliminary, final, or withdrawn", rejectionCode: "SCHEMA_MISMATCH" };
    }
    if (!["complete", "partial", "unknown"].includes(parsed.coverage)) {
      return { accepted: false, rejectionReason: "coverage must be complete, partial, or unknown", rejectionCode: "SCHEMA_MISMATCH" };
    }
    if (!["valid", "partial", "invalid", "unknown"].includes(parsed.quality)) {
      return { accepted: false, rejectionReason: "interval-energy requires an explicit quality", rejectionCode: "SCHEMA_MISMATCH" };
    }
    if (!isPositiveInteger(parsed.dataRevision)) {
      return { accepted: false, rejectionReason: "dataRevision must be a positive integer", rejectionCode: "SCHEMA_MISMATCH" };
    }
    if (!isExplicitTimestamp(parsed.publishedAt)) {
      return { accepted: false, rejectionReason: "publishedAt must be an explicit ISO timestamp", rejectionCode: "SCHEMA_MISMATCH" };
    }

    if (parsed.periodStatus === "withdrawn") {
      if (parsed.value !== null) {
        return { accepted: false, rejectionReason: "Withdrawn report must have null value", rejectionCode: "INVALID_VALUE" };
      }
      if (!parsed.reason || typeof parsed.reason !== "string" || parsed.reason.trim() === "") {
        return { accepted: false, rejectionReason: "Withdrawn report must specify a reason", rejectionCode: "REASON_REQUIRED" };
      }
    } else {
      if (parsed.value !== null) {
        if (!isNonNegativeDecimal(parsed.value)) {
          return { accepted: false, rejectionReason: "interval-energy value must be non-negative", rejectionCode: "INVALID_VALUE" };
        }
      }
      if (parsed.dataRevision > 1 && (typeof parsed.reason !== "string" || parsed.reason.trim() === "")) {
        return { accepted: false, rejectionReason: `Correction revision ${parsed.dataRevision} requires a reason`, rejectionCode: "REASON_REQUIRED" };
      }
    }
    const registrationError = validateRegistration(parsed, kind, options);
    return registrationError ?? { accepted: true, packet: parsed as EngineeringDailyPacket };
  }

  if (kind === "cumulative-energy") {
    if (parsed.unit !== "kWh") {
      return { accepted: false, rejectionReason: `cumulative-energy requires unit "kWh", got "${parsed.unit}"`, rejectionCode: "UNIT_MISMATCH" };
    }
    if (!isExplicitTimestamp(parsed.observedAt)) {
      return { accepted: false, rejectionReason: "cumulative-energy requires valid ISO observedAt", rejectionCode: "MISSING_OBSERVED_AT" };
    }
    if (!parsed.counterEpoch || typeof parsed.counterEpoch !== "string" || parsed.counterEpoch.trim() === "") {
      return { accepted: false, rejectionReason: "cumulative-energy requires non-empty counterEpoch", rejectionCode: "SCHEMA_MISMATCH" };
    }
    if (!isNonNegativeDecimal(parsed.value)) {
      return { accepted: false, rejectionReason: "cumulative-energy requires non-negative numeric value", rejectionCode: "INVALID_VALUE" };
    }
    if (!["valid", "partial", "invalid", "unknown"].includes(parsed.quality)) {
      return { accepted: false, rejectionReason: "cumulative-energy requires an explicit quality", rejectionCode: "SCHEMA_MISMATCH" };
    }
    const registrationError = validateRegistration(parsed, kind, options);
    return registrationError ?? { accepted: true, packet: parsed as EngineeringCumulativePacket };
  }

  return {
    accepted: false,
    rejectionReason: `Unsupported measurementKind "${kind}"`,
    rejectionCode: "MODE_MISMATCH"
  };
}
