import type {
  DisplayPageKey,
  DisplayPageId,
  DisplayPageAssetFinding,
  DisplayPageAssetHealthEntry,
  DisplayPageAssetHealthReport,
  DisplayPageAssetFindingReason,
} from "@solar-display/shared";
import {
  displayPageMediaFitModes,
  isDisplayPageMediaBinding,
  normalizeDisplayPageFreeformObjects,
  normalizeDisplayPageMediaBindingBySourceMode,
  resolveDisplayPageMediaSourceMode
} from "@solar-display/shared";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../config.js";
import { getDatabase } from "../db/index.js";

type ImageAssetReferenceRow = {
  filename: string | null;
  title: string | null;
};

type UnknownRecord = Record<string, unknown>;
type ManagedAssetResolution = {
  filename: string | null;
  reason: DisplayPageAssetFindingReason | null;
  title: string | null;
};

export type DisplayPageMediaPlacementIssue = {
  bindingId: string;
  message: string;
};

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readManagedAssetResolution(assetId: number | string): ManagedAssetResolution {
  const row = getDatabase()
    .prepare("SELECT filename, title FROM image_assets WHERE id = ?")
    .get(assetId) as ImageAssetReferenceRow | undefined;
  const filename = row?.filename ?? null;
  const title = row?.title ?? null;

  if (!filename) {
    return {
      filename: null,
      reason: "missing-asset",
      title
    };
  }

  if (!existsSync(resolve(config.uploadsDir, filename))) {
    return {
      filename: null,
      reason: "missing-file",
      title
    };
  }

  return {
    filename,
    reason: null,
    title
  };
}

function normalizeMediaBindingForStorage(binding: UnknownRecord) {
  return normalizeDisplayPageMediaBindingBySourceMode(cloneValue(binding));
}

function resolveMediaBinding(binding: UnknownRecord) {
  const resolved = normalizeDisplayPageMediaBindingBySourceMode(cloneValue(binding));
  const sourceMode = resolveDisplayPageMediaSourceMode(resolved);
  const assetId = resolved.assetId;

  if (sourceMode === "managed-asset" && (typeof assetId === "number" || typeof assetId === "string")) {
    const { filename } = readManagedAssetResolution(assetId);
    if (filename) {
      resolved.src = `/uploads/images/${filename}`;
    } else {
      delete resolved.src;
    }
  }

  if (sourceMode === "seed-default") {
    delete resolved.src;
  }

  return resolved;
}

type DisplayPageAssetReference = {
  assetId: string | number;
  bindingId: string;
  kind: "display-page" | "page-object" | "shell-decoration";
  pageId: DisplayPageId;
};

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
  pageId: DisplayPageId,
  regions: Record<string, unknown>,
  freeformObjects: unknown[] = []
) {
  const findings: DisplayPageAssetFinding[] = [];

  for (const reference of collectDisplayPageAssetReferences(pageId, regions, freeformObjects)) {
    const { reason } = readManagedAssetResolution(reference.assetId);
    if (!reason) {
      continue;
    }

    findings.push({
      assetId: reference.assetId,
      bindingId: reference.bindingId,
      message:
        reason === "missing-file"
          ? `素材檔案遺失，無法解析${reference.kind === "page-object" ? " page object" : ""} binding ${reference.bindingId}`
          : `素材引用不存在，無法解析${reference.kind === "page-object" ? " page object" : ""} binding ${reference.bindingId}`,
      pageId: reference.pageId,
      reason,
      status: "unhealthy"
    });
  }

  return findings;
}

export function collectDisplayPageMediaPlacementIssues(regions: Record<string, unknown>) {
  const issues: DisplayPageMediaPlacementIssue[] = [];

  function pushIssue(bindingId: string, message: string) {
    issues.push({ bindingId, message });
  }

  function scan(value: unknown, path: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => scan(item, `${path}[${index}]`));
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    if (isDisplayPageMediaBinding(value)) {
      if ("fitMode" in value && !displayPageMediaFitModes.includes(value.fitMode as never)) {
        pushIssue(`${path}.fitMode`, `${path}.fitMode 僅支援 contain 或 cover`);
      }

      if ("focusX" in value) {
        const focusX = value.focusX;
        if (typeof focusX !== "number" || !Number.isFinite(focusX) || focusX < 0 || focusX > 1) {
          pushIssue(`${path}.focusX`, `${path}.focusX 必須介於 0 和 1 之間`);
        }
      }

      if ("focusY" in value) {
        const focusY = value.focusY;
        if (typeof focusY !== "number" || !Number.isFinite(focusY) || focusY < 0 || focusY > 1) {
          pushIssue(`${path}.focusY`, `${path}.focusY 必須介於 0 和 1 之間`);
        }
      }

      if ("alignX" in value) {
        const alignX = value.alignX;
        if (typeof alignX !== "number" || !Number.isFinite(alignX)) {
          pushIssue(`${path}.alignX`, `${path}.alignX 必須為有效數字`);
        }
      }

      if ("alignY" in value) {
        const alignY = value.alignY;
        if (typeof alignY !== "number" || !Number.isFinite(alignY)) {
          pushIssue(`${path}.alignY`, `${path}.alignY 必須為有效數字`);
        }
      }
    }

    for (const [key, child] of Object.entries(value)) {
      scan(child, path ? `${path}.${key}` : key);
    }
  }

  scan(regions, "");
  return issues;
}

function parseDisplayPageConfigPayload(raw: string | null | undefined) {
  if (!raw) {
    return {
      freeformObjects: [],
      regions: {}
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if ("regions" in parsed && parsed.regions && typeof parsed.regions === "object" && !Array.isArray(parsed.regions)) {
        return {
          freeformObjects:
            "freeformObjects" in parsed && Array.isArray(parsed.freeformObjects)
              ? normalizeDisplayPageFreeformObjects(parsed.freeformObjects)
              : [],
          regions: parsed.regions as Record<string, unknown>
        };
      }

      return {
        freeformObjects: [],
        regions: parsed as Record<string, unknown>
      };
    }
  } catch {
    // ignore malformed config rows
  }

  return {
    freeformObjects: [],
    regions: {}
  };
}

export function collectDisplayPageAssetReferences(
  pageId: DisplayPageId,
  regions: Record<string, unknown>,
  freeformObjects: unknown[] = []
) {
  const references: DisplayPageAssetReference[] = [];

  function scan(value: unknown, path: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => scan(item, `${path}[${index}]`));
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    if (isDisplayPageMediaBinding(value)) {
      if (resolveDisplayPageMediaSourceMode(value) !== "managed-asset") {
        return;
      }

      const assetId = value.assetId;
      if (typeof assetId === "number" || typeof assetId === "string") {
        references.push({
          assetId,
          bindingId: path,
          kind: "display-page",
          pageId
        });
      }
    }

    for (const [key, child] of Object.entries(value)) {
      scan(child, path ? `${path}.${key}` : key);
    }
  }

  scan(regions, "");

  for (const object of normalizeDisplayPageFreeformObjects(freeformObjects)) {
    if (object.type !== "asset-image" && object.type !== "icon-asset") {
      continue;
    }

    const assetId = object.source.assetId;
    if (typeof assetId !== "number" && typeof assetId !== "string") {
      continue;
    }

    references.push({
      assetId,
      bindingId: object.id,
      kind: "page-object",
      pageId
    });
  }

  return references;
}

export function collectShellDecorationAssetReferences(raw: string | null | undefined) {
  const references: DisplayPageAssetReference[] = [];

  if (!raw) {
    return references;
  }

  try {
    const parsed = JSON.parse(raw) as {
      footerObjects?: unknown;
      headerObjects?: unknown;
    };
    const groups: Array<{ mount: "footer" | "header"; objects: unknown[] }> = [];

    if (Array.isArray(parsed.headerObjects)) {
      groups.push({ mount: "header", objects: parsed.headerObjects });
    }
    if (Array.isArray(parsed.footerObjects)) {
      groups.push({ mount: "footer", objects: parsed.footerObjects });
    }

    for (const group of groups) {
      for (const object of group.objects) {
        if (!isPlainObject(object) || object.type !== "asset-image" || !isPlainObject(object.source)) {
          continue;
        }

        const assetId = object.source.assetId;
        if ((typeof assetId !== "number" && typeof assetId !== "string") || typeof object.id !== "string") {
          continue;
        }

        references.push({
          assetId,
          bindingId: object.id,
          kind: "shell-decoration",
          pageId: "shared-shell"
        });
      }
    }
  } catch {
    return references;
  }

  return references;
}

function assetReferenceKey(assetId: string | number) {
  return `${typeof assetId}:${assetId}`;
}

export function computeDisplayPageAssetHealthReport(): DisplayPageAssetHealthReport {
  const database = getDatabase();
  const rows = [
    ...(database
      .prepare("SELECT page_key, config_json FROM display_page_configs")
      .all() as Array<{ config_json: string | null; page_key: DisplayPageKey }>),
    ...(database
      .prepare("SELECT page_key, config_json FROM display_page_stage_configs")
      .all() as Array<{ config_json: string | null; page_key: DisplayPageKey }>)
  ];
  const assetEntries = new Map<string, DisplayPageAssetHealthEntry>();
  const findings: DisplayPageAssetFinding[] = [];

  for (const row of rows) {
    const payload = parseDisplayPageConfigPayload(row.config_json);
    const references = collectDisplayPageAssetReferences(
      row.page_key,
      payload.regions,
      payload.freeformObjects
    );

    for (const reference of references) {
      const key = assetReferenceKey(reference.assetId);
      const resolution = readManagedAssetResolution(reference.assetId);
      const finding =
        resolution.reason === null
          ? null
          : {
              assetId: reference.assetId,
              bindingId: reference.bindingId,
              message:
                resolution.reason === "missing-file"
                  ? `素材檔案遺失，無法解析${reference.kind === "page-object" ? " page object" : ""} binding ${reference.bindingId}`
                  : `素材引用不存在，無法解析${reference.kind === "page-object" ? " page object" : ""} binding ${reference.bindingId}`,
              pageId: reference.pageId,
              reason: resolution.reason,
              status: "unhealthy" as const
            };

      const existingEntry = assetEntries.get(key) ?? {
        assetId: reference.assetId,
        affectedPages: [],
        bindings: [],
        filename: resolution.filename,
        findings: [],
        reasons: [],
        status: "healthy" as const,
        title: resolution.title
      };

      if (!existingEntry.affectedPages.includes(reference.pageId)) {
        existingEntry.affectedPages.push(reference.pageId);
      }

      if (
        !existingEntry.bindings.some(
          (binding) => binding.pageId === reference.pageId && binding.bindingId === reference.bindingId
        )
      ) {
        existingEntry.bindings.push({
          bindingId: reference.bindingId,
          pageId: reference.pageId
        });
      }

      if (finding) {
        existingEntry.status = "unhealthy";
        if (!existingEntry.reasons.includes(finding.reason)) {
          existingEntry.reasons.push(finding.reason);
        }
        if (
          !existingEntry.findings.some(
            (entryFinding) =>
              entryFinding.pageId === finding.pageId &&
              entryFinding.bindingId === finding.bindingId &&
              entryFinding.reason === finding.reason
          )
        ) {
          existingEntry.findings.push(finding);
          findings.push(finding);
        }
      }

      assetEntries.set(key, existingEntry);
    }
  }

  const shellRows = database.prepare(
    "SELECT config_json FROM shell_decoration_stage_configs"
  ).all() as Array<{ config_json: string | null }>;

  for (const row of shellRows) {
    const references = collectShellDecorationAssetReferences(row.config_json);

    for (const reference of references) {
      const key = assetReferenceKey(reference.assetId);
      const resolution = readManagedAssetResolution(reference.assetId);
      const finding =
        resolution.reason === null
          ? null
          : {
              assetId: reference.assetId,
              bindingId: reference.bindingId,
              message:
                resolution.reason === "missing-file"
                  ? `素材檔案遺失，無法解析 shell binding ${reference.bindingId}`
                  : `素材引用不存在，無法解析 shell binding ${reference.bindingId}`,
              pageId: reference.pageId,
              reason: resolution.reason,
              status: "unhealthy" as const
            };

      const existingEntry = assetEntries.get(key) ?? {
        assetId: reference.assetId,
        affectedPages: [],
        bindings: [],
        filename: resolution.filename,
        findings: [],
        reasons: [],
        status: "healthy" as const,
        title: resolution.title
      };

      if (!existingEntry.affectedPages.includes(reference.pageId)) {
        existingEntry.affectedPages.push(reference.pageId);
      }

      if (
        !existingEntry.bindings.some(
          (binding) => binding.pageId === reference.pageId && binding.bindingId === reference.bindingId
        )
      ) {
        existingEntry.bindings.push({
          bindingId: reference.bindingId,
          pageId: reference.pageId
        });
      }

      if (finding) {
        existingEntry.status = "unhealthy";
        if (!existingEntry.reasons.includes(finding.reason)) {
          existingEntry.reasons.push(finding.reason);
        }
        if (
          !existingEntry.findings.some(
            (entryFinding) =>
              entryFinding.pageId === finding.pageId &&
              entryFinding.bindingId === finding.bindingId &&
              entryFinding.reason === finding.reason
          )
        ) {
          existingEntry.findings.push(finding);
          findings.push(finding);
        }
      }

      assetEntries.set(key, existingEntry);
    }
  }

  const assets = Array.from(assetEntries.values()).sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "unhealthy" ? -1 : 1;
    }

    return String(left.assetId).localeCompare(String(right.assetId));
  });

  return {
    assets,
    findings,
    generatedAt: new Date().toISOString(),
    status: findings.length > 0 ? "unhealthy" : "healthy"
  };
}
