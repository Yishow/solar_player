import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../config.js";

export type ReleaseManifest = {
  builtAt: string;
  commit: string;
  packageVersion: string;
  releaseId: string;
  schemaVersion: number;
  sourceDirty: boolean;
};

export type ReleaseIdentity = {
  available: boolean;
  builtAt: string | null;
  commit: string | null;
  packageVersion: string | null;
  releaseId: string | null;
  schemaVersion: number | null;
  sourceDirty: boolean | null;
  unavailableReason: string | null;
};

function boundedReason(reason: string): string {
  const compact = reason.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return "Release identity unavailable";
  }
  return compact.length > 200 ? `${compact.slice(0, 197)}...` : compact;
}

function unavailable(reason: string): ReleaseIdentity {
  return {
    available: false,
    builtAt: null,
    commit: null,
    packageVersion: null,
    releaseId: null,
    schemaVersion: null,
    sourceDirty: null,
    unavailableReason: boundedReason(reason)
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseReleaseManifest(raw: unknown): ReleaseManifest {
  if (!raw || typeof raw !== "object") {
    throw new Error("Release manifest is not an object");
  }

  const record = raw as Record<string, unknown>;
  if (!isNonEmptyString(record.releaseId)) {
    throw new Error("Release manifest is missing releaseId");
  }
  if (!isNonEmptyString(record.commit)) {
    throw new Error("Release manifest is missing commit");
  }
  if (!isNonEmptyString(record.builtAt)) {
    throw new Error("Release manifest is missing builtAt");
  }
  if (!isNonEmptyString(record.packageVersion)) {
    throw new Error("Release manifest is missing packageVersion");
  }
  if (typeof record.schemaVersion !== "number" || !Number.isInteger(record.schemaVersion)) {
    throw new Error("Release manifest has invalid schemaVersion");
  }
  if (typeof record.sourceDirty !== "boolean") {
    throw new Error("Release manifest has invalid sourceDirty");
  }

  return {
    builtAt: record.builtAt.trim(),
    commit: record.commit.trim(),
    packageVersion: record.packageVersion.trim(),
    releaseId: record.releaseId.trim(),
    schemaVersion: record.schemaVersion,
    sourceDirty: record.sourceDirty
  };
}

export function readReleaseIdentity(
  options: {
    manifestPath?: string;
  } = {}
): ReleaseIdentity {
  const manifestPath = resolve(options.manifestPath ?? config.releaseManifestPath);

  if (!existsSync(manifestPath)) {
    return unavailable("Release manifest is missing");
  }

  try {
    const text = readFileSync(manifestPath, "utf8");
    const parsed = parseReleaseManifest(JSON.parse(text) as unknown);
    return {
      available: true,
      builtAt: parsed.builtAt,
      commit: parsed.commit,
      packageVersion: parsed.packageVersion,
      releaseId: parsed.releaseId,
      schemaVersion: parsed.schemaVersion,
      sourceDirty: parsed.sourceDirty,
      unavailableReason: null
    };
  } catch {
    return unavailable("Release manifest is corrupt");
  }
}
