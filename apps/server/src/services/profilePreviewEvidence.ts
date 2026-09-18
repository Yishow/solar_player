import type { PeriodSelection, SiteEnergyProfile } from "@solar-display/shared";

export function conflict(code: string): never {
  throw Object.assign(new Error(code), { code, statusCode: 409 });
}

export function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value as Record<string, unknown>)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

export type PreviewPeriodEvidence = {
  selection: PeriodSelection;
  revisionFingerprint?: string;
};

export function isPeriodSelection(value: unknown): value is PeriodSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { day?: unknown; kind?: unknown; month?: unknown; year?: unknown };
  if (typeof candidate.year !== "number" || !Number.isInteger(candidate.year)) return false;
  if (candidate.kind === "year") return true;
  if (candidate.kind !== "month" && candidate.kind !== "day") return false;
  if (typeof candidate.month !== "number" || !Number.isInteger(candidate.month)
    || candidate.month < 1 || candidate.month > 12) return false;
  if (candidate.kind === "month") return true;
  return typeof candidate.day === "number" && Number.isInteger(candidate.day)
    && candidate.day >= 1 && candidate.day <= 31;
}

export function readPreviewPeriodEvidence(
  value: string,
  schemaVersion: SiteEnergyProfile["schemaVersion"]
): PreviewPeriodEvidence {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    conflict("PROFILE_SOURCE_REVIEW_REQUIRED");
  }

  if (schemaVersion === 1) {
    return { selection: parsed as PeriodSelection };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    conflict("PROFILE_SOURCE_REVIEW_REQUIRED");
  }
  const envelope = parsed as { revisionFingerprint?: unknown; selection?: unknown };
  if (!isPeriodSelection(envelope.selection)
    || typeof envelope.revisionFingerprint !== "string"
    || !/^[a-f0-9]{64}$/u.test(envelope.revisionFingerprint)) {
    conflict("PROFILE_SOURCE_REVIEW_REQUIRED");
  }
  return {
    revisionFingerprint: envelope.revisionFingerprint,
    selection: envelope.selection as PeriodSelection
  };
}

export function previewSourceConflict(error: unknown): never {
  const code = error && typeof error === "object" && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  if (code === "PROFILE_SOURCE_UNAVAILABLE" || code === "PROFILE_ENGINEERING_SOURCE_UNAVAILABLE") {
    conflict("PROFILE_SOURCE_CONFLICT");
  }
  throw error;
}
