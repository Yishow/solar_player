import type { DisplayCircuitSlotKey } from "./displayReadiness.js";

export const KN_ENGINEERING_IDS = [
  "stamping",
  "body",
  "painting",
  "assembly",
  "utility",
  "office",
  "heavy_vehicle",
  "ed_coating"
] as const satisfies readonly DisplayCircuitSlotKey[];

export type KnEngineeringId = (typeof KN_ENGINEERING_IDS)[number];

export const KN_ENGINEERING_NAMES: Record<KnEngineeringId, string> = {
  stamping: "沖壓工程",
  body: "車身工程",
  painting: "塗裝工程",
  assembly: "裝配工程",
  utility: "原動力",
  office: "事務系",
  heavy_vehicle: "大車工程",
  ed_coating: "ED電著"
};

export const KN_ENGINEERING_MODES = [
  "unconfigured",
  "power-gauge",
  "daily-report",
  "cumulative-energy"
] as const;

export type KnEngineeringMode = (typeof KN_ENGINEERING_MODES)[number];

export type KnEngineeringPurpose = "power" | "energy";

export interface EngineeringDeliverySchedule {
  dueLocalTime: string;
  dayOffset: number;
  graceMinutes: number;
}

export interface EngineeringSourceDefinition {
  sourceRef: string;
  configurationRevision: number;
  sourceKind: "engineering";
  site: "kn";
  engineeringId: KnEngineeringId;
  engineeringName: string;
  purpose: KnEngineeringPurpose;
  mode: KnEngineeringMode;
  exactTopic: string;
  approvedPublisherId: string | null;
  definitionRevision: number;
  definitionSummary: string;
  scopeCoverage: string;
  unit: "kW" | "kWh" | null;
  scaleDecimal: number;
  qualityPolicy: string | null;
  calendarRevision: number | null;
  expectedDelivery: EngineeringDeliverySchedule | null;
  replayWindowDays: number;
  enabled: boolean;
  reviewStatus: "unreviewed" | "draft" | "approved" | "rejected";
}

export function isKnEngineeringId(value: unknown): value is KnEngineeringId {
  return typeof value === "string" && (KN_ENGINEERING_IDS as readonly string[]).includes(value);
}

export function buildDefaultEngineeringExactTopic(
  engineeringId: KnEngineeringId,
  mode: KnEngineeringMode
): string {
  switch (mode) {
    case "power-gauge":
      return `factory/guanyin/power/${engineeringId}`;
    case "daily-report":
      return `factory/guanyin/energy/daily/${engineeringId}`;
    case "cumulative-energy":
      return `factory/guanyin/energy/cumulative/${engineeringId}`;
    case "unconfigured":
      return `factory/guanyin/pending/${engineeringId}`;
  }
}

export function validateKnEngineeringSource(
  input: Partial<EngineeringSourceDefinition> & Record<string, unknown>
): { valid: true; source: EngineeringSourceDefinition } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (input.sourceKind !== "engineering") {
    errors.push(`sourceKind must be "engineering", received: ${JSON.stringify(input.sourceKind)}`);
  }

  if (input.site !== "kn") {
    errors.push(`site must be "kn" for engineering sources, received: ${JSON.stringify(input.site)}`);
  }

  if (!input.engineeringId || typeof input.engineeringId !== "string") {
    errors.push("engineeringId is required and must be a string");
  } else if (!isKnEngineeringId(input.engineeringId)) {
    errors.push(
      `Unknown engineering identity "${input.engineeringId}". Aliases or arbitrary IDs are not permitted.`
    );
  }

  const engId = isKnEngineeringId(input.engineeringId) ? input.engineeringId : ("stamping" as KnEngineeringId);

  const purpose: KnEngineeringPurpose =
    input.purpose === "power" || input.purpose === "energy" ? input.purpose : "power";
  if (!input.purpose || (input.purpose !== "power" && input.purpose !== "energy")) {
    errors.push(`purpose must be "power" or "energy", received: ${JSON.stringify(input.purpose)}`);
  }

  const mode: KnEngineeringMode = (KN_ENGINEERING_MODES as readonly string[]).includes(
    input.mode as string
  )
    ? (input.mode as KnEngineeringMode)
    : "unconfigured";
  if (!input.mode || !(KN_ENGINEERING_MODES as readonly string[]).includes(input.mode as string)) {
    errors.push(`mode must be one of ${KN_ENGINEERING_MODES.join(", ")}, received: ${JSON.stringify(input.mode)}`);
  }

  if (input.enabled && mode === "unconfigured") {
    errors.push(`Cannot enable engineering source with mode "unconfigured"`);
  }

  if (purpose === "power" && mode !== "unconfigured" && mode !== "power-gauge") {
    errors.push(`Power purpose requires mode "power-gauge", received: "${mode}"`);
  }

  if (purpose === "energy" && mode !== "unconfigured" && mode !== "daily-report" && mode !== "cumulative-energy") {
    errors.push(`Energy purpose requires mode "daily-report" or "cumulative-energy", received: "${mode}"`);
  }

  if (mode === "power-gauge" && input.unit && input.unit !== "kW") {
    errors.push(`Mode "power-gauge" requires unit "kW", received: "${input.unit}"`);
  }

  if ((mode === "daily-report" || mode === "cumulative-energy") && input.unit && input.unit !== "kWh") {
    errors.push(`Energy modes require unit "kWh", received: "${input.unit}"`);
  }

  if (input.exactTopic && typeof input.exactTopic === "string") {
    const topic = input.exactTopic;
    if (topic.includes("#") || topic.includes("+")) {
      errors.push(`Wildcard topics (# or +) are forbidden for engineering exact topic: "${topic}"`);
    }
    if (purpose === "power" && (topic.includes("/energy/") || topic.includes("/daily/") || topic.includes("/cumulative/"))) {
      errors.push(`Power source topic cannot use energy path: "${topic}"`);
    }
    if (purpose === "energy" && topic.includes("/power/")) {
      errors.push(`Energy source topic cannot use power path: "${topic}"`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validated: EngineeringSourceDefinition = {
    sourceRef: input.sourceRef || `kn-eng-${engId}-${purpose}`,
    configurationRevision: typeof input.configurationRevision === "number" ? input.configurationRevision : 1,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: engId,
    engineeringName: input.engineeringName || KN_ENGINEERING_NAMES[engId],
    purpose,
    mode,
    exactTopic: input.exactTopic || buildDefaultEngineeringExactTopic(engId, mode),
    approvedPublisherId: typeof input.approvedPublisherId === "string" ? input.approvedPublisherId : null,
    definitionRevision: typeof input.definitionRevision === "number" ? input.definitionRevision : 1,
    definitionSummary: typeof input.definitionSummary === "string" ? input.definitionSummary : "",
    scopeCoverage: typeof input.scopeCoverage === "string" ? input.scopeCoverage : "department-aggregate",
    unit: mode === "power-gauge" ? "kW" : mode === "unconfigured" ? null : "kWh",
    scaleDecimal: typeof input.scaleDecimal === "number" ? input.scaleDecimal : 1,
    qualityPolicy: typeof input.qualityPolicy === "string" ? input.qualityPolicy : null,
    calendarRevision: typeof input.calendarRevision === "number" ? input.calendarRevision : 1,
    expectedDelivery: input.expectedDelivery || null,
    replayWindowDays: typeof input.replayWindowDays === "number" ? input.replayWindowDays : 93,
    enabled: Boolean(input.enabled),
    reviewStatus: input.reviewStatus || "draft"
  };

  return { valid: true, source: validated };
}
