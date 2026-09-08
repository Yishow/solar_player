import type { MeterSourceDefinition } from "./meterReading.js";

export type MappingSelector = {
  path: string[];
  tagEquals?: string;
  selectorVersion?: number;
  timestampPath?: string[];
};

export type MappingPreviewDraft = {
  channelId: string;
  energyFlowRole: "consumption" | "generation" | "grid-import" | "grid-export";
  measurementKind: "power-gauge" | "cumulative-energy" | "interval-energy";
  metricScope: "cl" | "kn";
  selector: MappingSelector;
  timestampPolicy: "source-required" | "allow-receive-time-estimate";
  source?: MeterSourceDefinition;
  topic?: string;
};

export const GUIDED_MAPPING_ACTIVATION_STATES = ["active", "inactive", "pending", "failed"] as const;
export type GuidedMappingActivationState = (typeof GUIDED_MAPPING_ACTIVATION_STATES)[number];

/**
 * Saving a reviewed mapping, having the broker acknowledge its subscription and
 * having actually received a measurement are three distinct facts. `active` only
 * means the subscription was acknowledged. A disabled source reports `inactive`
 * rather than borrowing an acknowledgement another owner of the topic holds.
 */
export type GuidedMappingActivation = {
  reason: string | null;
  retryable: boolean;
  state: GuidedMappingActivationState;
  topic: string;
};

export type GuidedMappingReception = {
  lastAcceptedAt: string | null;
  observed: boolean;
};

export type GuidedMappingApplyResult = {
  activation: GuidedMappingActivation;
  applied: true;
  channelId: string;
  reception: GuidedMappingReception;
  saved: true;
  source: MeterSourceDefinition;
};

type StoredPreview = {
  draft: MappingPreviewDraft;
  hash: string;
};

type AppliedMapping = {
  applied: true;
  channelId: string;
  previewToken: string;
};

const tokens = new Map<string, StoredPreview>();
const appliedByKey = new Map<string, AppliedMapping>();

export function compileSelector(
  path: string,
  tagEquals?: string,
  metadata: Pick<MappingSelector, "selectorVersion" | "timestampPath"> = {}
): MappingSelector {
  const normalized = path.replace(/^\$\./u, "");
  return {
    path: normalized.split(".").filter(Boolean),
    tagEquals,
    selectorVersion: metadata.selectorVersion ?? 1,
    ...(metadata.timestampPath ? { timestampPath: metadata.timestampPath } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function extractBySelector(payload: unknown, selector: MappingSelector): unknown {
  let current: unknown = payload;
  if (selector.tagEquals) {
    const records = Array.isArray(current) ? current : [current];
    const matches = records.filter((record) => isRecord(record) && record.tag === selector.tagEquals);
    if (matches.length > 1) {
      throw Object.assign(new Error("AMBIGUOUS_TAG"), { code: "AMBIGUOUS_TAG" });
    }
    if (matches.length === 0) {
      return undefined;
    }
    current = matches[0];
  }
  for (const token of selector.path) {
    if (Array.isArray(current) && /^\d+$/u.test(token)) {
      current = current[Number(token)];
      continue;
    }
    if (isRecord(current) && token in current) {
      current = current[token];
      continue;
    }
    return undefined;
  }
  return current;
}

export function extractDecimalLexeme(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^-?\d+(\.\d+)?$/u.test(trimmed) ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value) && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (isRecord(value) && "value" in value) {
    return extractDecimalLexeme(value.value);
  }
  return null;
}

export function previewMapping(draft: MappingPreviewDraft) {
  const hash = JSON.stringify(draft);
  const previewToken = `m2-${draft.metricScope}-${draft.channelId}-${hash.length}-${tokens.size + 1}`;
  tokens.set(previewToken, { draft, hash });
  return { canonicalDraft: JSON.parse(JSON.stringify(draft)) as MappingPreviewDraft, previewToken };
}

export function applyMapping(input: {
  previewToken: string;
  canonicalDraft: MappingPreviewDraft;
  idempotencyKey: string;
}): AppliedMapping {
  const previous = appliedByKey.get(input.idempotencyKey);
  if (previous && previous.previewToken === input.previewToken) {
    const stored = tokens.get(input.previewToken);
    if (stored && JSON.stringify(input.canonicalDraft) === stored.hash) {
      return previous;
    }
  }
  const stored = tokens.get(input.previewToken);
  if (!stored) {
    throw Object.assign(new Error("PREVIEW_EXPIRED"), { code: "PREVIEW_EXPIRED" });
  }
  if (JSON.stringify(input.canonicalDraft) !== stored.hash) {
    throw Object.assign(new Error("PREVIEW_DRAFT_MISMATCH"), { code: "PREVIEW_DRAFT_MISMATCH" });
  }
  const result: AppliedMapping = {
    applied: true,
    channelId: input.canonicalDraft.channelId,
    previewToken: input.previewToken
  };
  appliedByKey.set(input.idempotencyKey, result);
  return result;
}
