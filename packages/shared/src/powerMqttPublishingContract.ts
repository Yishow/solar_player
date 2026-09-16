import type { SiteScope } from "./deviceIdentity.js";

export interface OpcPowerTopicParsed {
  site: SiteScope;
  kind: "raw" | "virtual";
  tagOrVirtualId: string;
}

export function parseOpcPowerTopicV1(topic: string): OpcPowerTopicParsed | null {
  const parts = topic.split("/");
  if (parts.length !== 5 || parts[0] !== "opc" || parts[1] !== "v1") {
    return null;
  }
  const site = parts[2];
  const kind = parts[3];
  const id = parts[4];
  if ((site !== "cl" && site !== "kn") || (kind !== "raw" && kind !== "virtual") || !id) {
    return null;
  }
  return { site, kind, tagOrVirtualId: id };
}

export function buildOpcPowerTopicV1(site: SiteScope, kind: "raw" | "virtual", id: string): string {
  return `opc/v1/${site}/${kind}/${id}`;
}

export interface PhysicalPowerReadingV1 {
  schemaVersion: 1;
  site: SiteScope;
  kind: "raw" | "virtual";
  tagId: string;
  publisherId: string;
  value: string; // Exact decimal string
  unit: "kW";
  readAt: string;
  sourceTimestamp: string | null;
  publishedAt: string;
  sourceQuality: "good" | "uncertain" | "bad";
  readStatus: "ok" | "error" | "timeout";
  sampleId?: string;
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

export function validatePhysicalPowerPacket(
  raw: any,
  options?: { expectedTopic?: string }
): { valid: true; packet: PhysicalPowerReadingV1 } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  if (raw.schemaVersion !== 1) {
    errors.push(`Expected schemaVersion 1, received: ${raw.schemaVersion}`);
  }

  if (raw.site !== "cl" && raw.site !== "kn") {
    errors.push(`site must be "cl" or "kn", received: ${raw.site}`);
  }

  if (raw.kind !== "raw" && raw.kind !== "virtual") {
    errors.push(`kind must be "raw" or "virtual", received: ${raw.kind}`);
  }

  if (!raw.tagId || typeof raw.tagId !== "string") {
    errors.push("tagId is required and must be a string");
  }

  if (!raw.publisherId || typeof raw.publisherId !== "string") {
    errors.push("publisherId is required and must be a string");
  }

  if (raw.unit !== "kW") {
    errors.push(`unit must be "kW", received: ${raw.unit}`);
  }

  if (typeof raw.value !== "string" || !/^-?\d+(\.\d+)?$/.test(raw.value)) {
    errors.push("value must be an exact decimal string");
  }

  if (!isExplicitTimestamp(raw.readAt)) {
    errors.push("readAt must be an ISO8601 timestamp with an explicit offset or Z");
  }

  if (!isExplicitTimestamp(raw.publishedAt)) {
    errors.push("publishedAt must be an ISO8601 timestamp with an explicit offset or Z");
  }

  if (raw.sourceTimestamp !== undefined && raw.sourceTimestamp !== null && !isExplicitTimestamp(raw.sourceTimestamp)) {
    errors.push("sourceTimestamp must use an explicit offset or Z when provided");
  }

  if (raw.sourceQuality === undefined) {
    errors.push("sourceQuality is required");
  } else if (raw.sourceQuality !== "good" && raw.sourceQuality !== "uncertain" && raw.sourceQuality !== "bad") {
    errors.push(`sourceQuality must be good, uncertain, or bad, received: ${raw.sourceQuality}`);
  } else if (raw.sourceQuality === "bad") {
    errors.push("sourceQuality bad cannot be admitted as a healthy reading");
  }

  if (raw.readStatus === undefined) {
    errors.push("readStatus is required");
  } else if (raw.readStatus !== "ok" && raw.readStatus !== "error" && raw.readStatus !== "timeout") {
    errors.push(`readStatus must be ok, error, or timeout, received: ${raw.readStatus}`);
  } else if (raw.readStatus !== "ok") {
    errors.push(`readStatus ${raw.readStatus} cannot be admitted as a healthy reading`);
  }

  if (options?.expectedTopic) {
    const parsed = parseOpcPowerTopicV1(options.expectedTopic);
    if (!parsed) {
      errors.push(`expectedTopic "${options.expectedTopic}" is not a valid opc-power-v1 topic`);
    } else {
      if (parsed.site !== raw.site) {
        errors.push(`Topic site "${parsed.site}" does not match payload site "${raw.site}"`);
      }
      if (parsed.kind !== raw.kind) {
        errors.push(`Topic kind "${parsed.kind}" does not match payload kind "${raw.kind}"`);
      }
      if (parsed.tagOrVirtualId !== raw.tagId) {
        errors.push(`Topic tagId "${parsed.tagOrVirtualId}" does not match payload tagId "${raw.tagId}"`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    packet: {
      schemaVersion: 1,
      site: raw.site,
      kind: raw.kind,
      tagId: raw.tagId,
      publisherId: raw.publisherId,
      value: raw.value,
      unit: "kW",
      readAt: raw.readAt,
      sourceTimestamp: raw.sourceTimestamp ?? null,
      publishedAt: raw.publishedAt,
      sourceQuality: raw.sourceQuality,
      readStatus: raw.readStatus,
      sampleId: raw.sampleId
    }
  };
}

export function evaluateVirtualPowerFormula(
  members: Array<{ id: string; value: string | null; quality: "good" | "uncertain" | "bad" }>
): { available: boolean; totalKW: string | null; error?: string } {
  if (members.length === 0) {
    return { available: false, totalKW: null, error: "Empty virtual members list" };
  }

  let sum = 0;
  for (const m of members) {
    if (m.value === null || m.quality !== "good") {
      return { available: false, totalKW: null, error: `Member ${m.id} is unavailable or not good` };
    }
    const val = Number(m.value);
    if (isNaN(val)) {
      return { available: false, totalKW: null, error: `Member ${m.id} has invalid numeric value` };
    }
    sum += val;
  }

  return { available: true, totalKW: sum.toFixed(3) };
}
