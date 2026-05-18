import type {
  DisplayPageAssetFinding,
  DisplayPageAssetFindingReason,
  DisplayPageKey
} from "@solar-display/shared";
import { isDisplayPageMediaBinding } from "@solar-display/shared";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";

type ImageAssetReferenceRow = {
  filename: string | null;
};

type UnknownRecord = Record<string, unknown>;
type ManagedAssetResolution = {
  filename: string | null;
  reason: DisplayPageAssetFindingReason | null;
};

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readManagedAssetResolution(assetId: number | string): ManagedAssetResolution {
  const row = getDatabase()
    .prepare("SELECT filename FROM image_assets WHERE id = ?")
    .get(assetId) as ImageAssetReferenceRow | undefined;
  const filename = row?.filename ?? null;

  if (!filename) {
    return {
      filename: null,
      reason: "missing-asset"
    };
  }

  if (!existsSync(resolve(config.uploadsDir, filename))) {
    return {
      filename: null,
      reason: "missing-file"
    };
  }

  return {
    filename,
    reason: null
  };
}

function normalizeMediaBindingForStorage(binding: UnknownRecord) {
  const normalized = cloneValue(binding);
  if ("assetId" in normalized && normalized.assetId !== undefined && normalized.assetId !== null) {
    delete normalized.src;
  }
  return normalized;
}

function resolveMediaBinding(binding: UnknownRecord) {
  const resolved = cloneValue(binding);
  const assetId = resolved.assetId;

  if (typeof assetId === "number" || typeof assetId === "string") {
    const { filename } = readManagedAssetResolution(assetId);
    if (filename) {
      resolved.src = `/uploads/images/${filename}`;
    } else {
      delete resolved.src;
    }
  }

  return resolved;
}

function mapDisplayPageRegions(
  value: unknown,
  transformBinding: (binding: UnknownRecord) => UnknownRecord
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => mapDisplayPageRegions(item, transformBinding));
  }

  if (!isPlainObject(value)) {
    return cloneValue(value);
  }

  if (isDisplayPageMediaBinding(value)) {
    return transformBinding(value);
  }

  const output: UnknownRecord = {};
  for (const [key, child] of Object.entries(value)) {
    output[key] = mapDisplayPageRegions(child, transformBinding);
  }
  return output;
}

export function normalizeDisplayPageRegionsForStorage<T extends Record<string, unknown>>(regions: T) {
  return mapDisplayPageRegions(regions, normalizeMediaBindingForStorage) as T;
}

export function resolveDisplayPageRegions<T extends Record<string, unknown>>(regions: T) {
  return mapDisplayPageRegions(regions, resolveMediaBinding) as T;
}

export function collectDisplayPageAssetFindings(
  pageId: DisplayPageKey,
  regions: Record<string, unknown>
) {
  const findings: DisplayPageAssetFinding[] = [];

  function scan(value: unknown, path: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => scan(item, `${path}[${index}]`));
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    if (isDisplayPageMediaBinding(value)) {
      const assetId = value.assetId;
      if (typeof assetId === "number" || typeof assetId === "string") {
        const { reason } = readManagedAssetResolution(assetId);
        if (reason) {
          findings.push({
            assetId,
            bindingId: path,
            message:
              reason === "missing-file"
                ? `素材檔案遺失，無法解析 binding ${path}`
                : `素材引用不存在，無法解析 binding ${path}`,
            pageId,
            reason,
            status: "unhealthy"
          });
        }
      }
    }

    for (const [key, child] of Object.entries(value)) {
      scan(child, path ? `${path}.${key}` : key);
    }
  }

  scan(regions, "");
  return findings;
}
