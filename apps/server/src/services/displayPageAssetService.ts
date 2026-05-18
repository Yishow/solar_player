import { isDisplayPageMediaBinding } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

type ImageAssetReferenceRow = {
  filename: string | null;
};

type UnknownRecord = Record<string, unknown>;

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readManagedAssetFilename(assetId: number | string) {
  const row = getDatabase()
    .prepare("SELECT filename FROM image_assets WHERE id = ?")
    .get(assetId) as ImageAssetReferenceRow | undefined;
  return row?.filename ?? null;
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
    const filename = readManagedAssetFilename(assetId);
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
