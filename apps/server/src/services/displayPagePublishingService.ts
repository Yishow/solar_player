import type {
  ConfigStage,
  DisplayPageId,
  DisplayPageFallbackStatus,
  DisplayPageConfigEnvelope,
  FallbackPolicy,
  FallbackStatusItem,
  PublishHistoryEntry,
  ValidationFinding,
  ValidationResult
} from "@solar-display/shared";
import {
  defaultFallbackPolicy,
  resolveDisplayPageFallbackPolicyByPageId
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { config } from "../config.js";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  collectDisplayPageAssetFindings,
  collectDisplayPageMediaPlacementIssues,
  normalizeDisplayPageRegionsForStorage
} from "./displayPageAssetService.js";

type StageConfigRow = {
  config_json: string;
  version: number;
  updated_at: string | null;
  published_at: string | null;
  published_by: string | null;
};

type PublishHistoryRow = {
  id: number;
  page_key: string;
  version: number;
  stage: string;
  action: string;
  config_json: string | null;
  published_by: string | null;
  source_version: number | null;
  published_at: string;
};

function parseRegions(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* fall through */ }
  return {};
}

function toEnvelope(
  pageId: DisplayPageId,
  stage: ConfigStage,
  row: StageConfigRow | undefined
): DisplayPageConfigEnvelope {
  if (!row) {
    return {
      pageId,
      regions: {},
      updatedAt: null,
      version: 1,
      stage,
      fallbackPolicy: resolveDisplayPageFallbackPolicyByPageId(pageId)
    };
  }
  return {
    pageId,
    regions: parseRegions(row.config_json),
    updatedAt: row.updated_at,
    version: row.version,
    stage,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    fallbackPolicy: resolveDisplayPageFallbackPolicyByPageId(pageId)
  };
}

function readStageConfig(pageId: DisplayPageId, stage: ConfigStage): DisplayPageConfigEnvelope {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT config_json, version, updated_at, published_at, published_by
     FROM display_page_stage_configs WHERE page_key = ? AND stage = ?`
  ).get(pageId, stage) as StageConfigRow | undefined;
  return toEnvelope(pageId, stage, row);
}

function writeStageConfig(pageId: DisplayPageId, stage: ConfigStage, regions: Record<string, unknown>): DisplayPageConfigEnvelope {
  const db = getDatabase();
  const normalizedRegions = normalizeDisplayPageRegionsForStorage(regions);
  db.prepare(
    `INSERT INTO display_page_stage_configs (page_key, stage, config_json, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(page_key, stage) DO UPDATE SET
       config_json = excluded.config_json,
       updated_at = CURRENT_TIMESTAMP`
  ).run(pageId, stage, JSON.stringify(normalizedRegions));
  return readStageConfig(pageId, stage);
}

function readNextLiveVersion(pageId: DisplayPageId) {
  return readStageConfig(pageId, "live").version + 1;
}

function validateConfigDraft(regions: Record<string, unknown>): ValidationResult {
  const findings: ValidationFinding[] = [];
  const placementIssues = collectDisplayPageMediaPlacementIssues(regions);
  const layoutRects: Array<{
    bottom: number;
    height: number;
    left: number;
    regionId: string;
    right: number;
    top: number;
    width: number;
  }> = [];

  if (placementIssues.length > 0) {
    findings.push(
      ...placementIssues.map((issue) => ({
        severity: "blocking" as const,
        code: "MEDIA_PLACEMENT_INVALID",
        message: issue.message,
        regionId: issue.bindingId
      }))
    );
  }

  for (const [regionId, value] of Object.entries(regions)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const rect = value as Record<string, unknown>;
      const { left, top, width, height } = rect;

      const nums: Record<string, number | undefined> = {
        left: typeof left === "number" ? left : undefined,
        top: typeof top === "number" ? top : undefined,
        width: typeof width === "number" ? width : undefined,
        height: typeof height === "number" ? height : undefined
      };
      for (const [key, val] of Object.entries(nums)) {
        if (val !== undefined && (typeof val !== "number" || !Number.isFinite(val))) {
          findings.push({ severity: "blocking", code: "GEOMETRY_INVALID_VALUE", message: `${regionId}.${key} 必須為有效數字`, regionId });
        }
      }

      const nLeft = typeof left === "number" ? left : null;
      const nTop = typeof top === "number" ? top : null;
      const nWidth = typeof width === "number" ? width : null;
      const nHeight = typeof height === "number" ? height : null;

      if (nLeft !== null && nWidth !== null && nLeft + nWidth > 1920) {
        findings.push({ severity: "blocking", code: "GEOMETRY_OUT_OF_BOUNDS", message: `${regionId} 超出畫布右邊界 (1920px)`, regionId });
      }
      if (nTop !== null && nHeight !== null && nTop + nHeight > 1080) {
        findings.push({ severity: "blocking", code: "GEOMETRY_OUT_OF_BOUNDS", message: `${regionId} 超出畫布底邊界 (1080px)`, regionId });
      }
      if (nLeft !== null && nLeft < 0) {
        findings.push({ severity: "blocking", code: "GEOMETRY_OUT_OF_BOUNDS", message: `${regionId} 超出畫布左邊界`, regionId });
      }
      if (nTop !== null && nTop < 0) {
        findings.push({ severity: "blocking", code: "GEOMETRY_OUT_OF_BOUNDS", message: `${regionId} 超出畫布上邊界`, regionId });
      }
      if (nWidth !== null && nWidth <= 0) {
        findings.push({ severity: "blocking", code: "GEOMETRY_INVALID_VALUE", message: `${regionId}.width 必須大於 0`, regionId });
      }
      if (nHeight !== null && nHeight <= 0) {
        findings.push({ severity: "blocking", code: "GEOMETRY_INVALID_VALUE", message: `${regionId}.height 必須大於 0`, regionId });
      }

      if (
        nLeft !== null &&
        nTop !== null &&
        nWidth !== null &&
        nHeight !== null &&
        nWidth > 0 &&
        nHeight > 0
      ) {
        layoutRects.push({
          bottom: nTop + nHeight,
          height: nHeight,
          left: nLeft,
          regionId,
          right: nLeft + nWidth,
          top: nTop,
          width: nWidth
        });
      }
    }
  }

  for (let index = 0; index < layoutRects.length; index += 1) {
    const current = layoutRects[index]!;
    for (let compareIndex = index + 1; compareIndex < layoutRects.length; compareIndex += 1) {
      const candidate = layoutRects[compareIndex]!;
      const overlaps =
        current.left < candidate.right &&
        current.right > candidate.left &&
        current.top < candidate.bottom &&
        current.bottom > candidate.top;

      if (!overlaps) {
        continue;
      }

      findings.push({
        severity: "blocking",
        code: "GEOMETRY_OVERLAP",
        message: `${current.regionId} 與 ${candidate.regionId} 發生重疊`,
        regionId: current.regionId
      });
      findings.push({
        severity: "blocking",
        code: "GEOMETRY_OVERLAP",
        message: `${candidate.regionId} 與 ${current.regionId} 發生重疊`,
        regionId: candidate.regionId
      });
    }
  }

  return { findings, canPublish: !findings.some((f) => f.severity === "blocking") };
}

function checkImageReferences(regions: Record<string, unknown>): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  if (!existsSync(config.uploadsDir)) return findings;

  const files = new Set(readdirSync(config.uploadsDir));

  function scan(obj: unknown, path: string) {
    if (typeof obj === "string" && obj.includes("/uploads/images/")) {
      const filename = obj.split("/").pop();
      if (filename && !files.has(filename)) {
        findings.push({ severity: "warning", code: "IMAGE_MISSING", message: `參考的圖片不存在: ${filename}`, regionId: path });
      }
    }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        scan(v, `${path}.${k}`);
      }
    }
  }
  scan(regions, "root");
  return findings;
}

function publishDraft(
  pageId: DisplayPageId,
  publishedBy?: string
): { live: DisplayPageConfigEnvelope; validation: ValidationResult } {
  const draft = readStageConfig(pageId, "draft");
  const validation = validateConfigDraft(draft.regions);

  if (!validation.canPublish) {
    return { live: readStageConfig(pageId, "live"), validation };
  }

  const imageWarnings = checkImageReferences(draft.regions);
  if (imageWarnings.length > 0) {
    validation.findings.push(...imageWarnings);
  }
  const assetWarnings = collectDisplayPageAssetFindings(pageId, draft.regions).map((finding) => ({
    code: "ASSET_REFERENCE_MISSING",
    message: finding.message,
    regionId: finding.bindingId,
    severity: "warning" as const
  }));
  if (assetWarnings.length > 0) {
    validation.findings.push(...assetWarnings);
  }

  const newVersion = readNextLiveVersion(pageId);
  const now = new Date().toISOString();
  const serializedRegions = JSON.stringify(draft.regions);

  const db = getDatabase();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at, published_at, published_by)
       VALUES (?, 'live', ?, ?, ?, ?, ?)
       ON CONFLICT(page_key, stage) DO UPDATE SET
         config_json = excluded.config_json,
         version = excluded.version,
         updated_at = excluded.updated_at,
         published_at = excluded.published_at,
         published_by = excluded.published_by`
    ).run(pageId, serializedRegions, newVersion, now, now, publishedBy ?? null);

    db.prepare(
      `INSERT INTO display_page_publish_history (page_key, version, stage, action, config_json, published_by, source_version)
       VALUES (?, ?, 'live', 'publish', ?, ?, ?)`
    ).run(pageId, newVersion, serializedRegions, publishedBy ?? null, draft.version);
  });
  tx();

  validation.canPublish = true;
  return { live: readStageConfig(pageId, "live"), validation };
}

function rollbackToVersion(
  pageId: DisplayPageId,
  targetVersion: number,
  publishedBy?: string
): DisplayPageConfigEnvelope {
  const db = getDatabase();
  const historyRow = db.prepare(
    `SELECT config_json FROM display_page_publish_history
     WHERE page_key = ? AND version = ? AND stage = 'live'
     ORDER BY id DESC LIMIT 1`
  ).get(pageId, targetVersion) as { config_json: string | null } | undefined;

  if (!historyRow?.config_json) {
    const error = new Error(`Version ${targetVersion} not found for rollback`);
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 404;
    throw error;
  }

  const regions = parseRegions(historyRow.config_json);
  const newVersion = readNextLiveVersion(pageId);
  const now = new Date().toISOString();
  const serializedRegions = JSON.stringify(regions);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at, published_at, published_by)
       VALUES (?, 'live', ?, ?, ?, ?, ?)
       ON CONFLICT(page_key, stage) DO UPDATE SET
         config_json = excluded.config_json,
         version = excluded.version,
         updated_at = excluded.updated_at,
         published_at = excluded.published_at,
         published_by = excluded.published_by`
    ).run(pageId, serializedRegions, newVersion, now, now, publishedBy ?? null);

    db.prepare(
      `INSERT INTO display_page_publish_history (page_key, version, stage, action, config_json, published_by, source_version)
       VALUES (?, ?, 'live', 'rollback', ?, ?, ?)`
    ).run(pageId, newVersion, serializedRegions, publishedBy ?? null, targetVersion);
  });
  tx();

  return readStageConfig(pageId, "live");
}

function getPublishHistory(pageId: DisplayPageId): PublishHistoryEntry[] {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT id, page_key, version, stage, action, config_json, published_by, source_version, published_at
     FROM display_page_publish_history WHERE page_key = ? ORDER BY id DESC`
  ).all(pageId) as PublishHistoryRow[];

  return rows.map((row) => ({
    version: row.version,
    stage: row.stage as ConfigStage,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    action: row.action as "publish" | "rollback",
    sourceVersion: row.source_version
  }));
}

function readFallbackPolicy(pageId: DisplayPageId): FallbackPolicy {
  const live = readStageConfig(pageId, "live");
  return live.fallbackPolicy ?? defaultFallbackPolicy;
}

function readFallbackStatus(pageId: DisplayPageId): DisplayPageFallbackStatus {
  const live = readStageConfig(pageId, "live");
  const policy = live.fallbackPolicy ?? defaultFallbackPolicy;
  const imageWarnings = checkImageReferences(live.regions);
  const assetFindings = collectDisplayPageAssetFindings(pageId, live.regions);
  const items: FallbackStatusItem[] = [
    { key: "staleData", mode: policy.staleData, active: false },
    {
      key: "missingAsset",
      mode: policy.missingAsset,
      active: imageWarnings.length > 0 || assetFindings.length > 0,
      message: assetFindings[0]?.message ?? imageWarnings[0]?.message
    },
    {
      key: "emptyContent",
      mode: policy.emptyContent,
      active: Object.keys(live.regions).length === 0
    }
  ];

  return {
    pageId,
    stage: "live",
    isFallbackActive: items.some((item) => item.active),
    items
  };
}

export {
  readStageConfig,
  writeStageConfig,
  validateConfigDraft,
  checkImageReferences,
  publishDraft,
  rollbackToVersion,
  getPublishHistory,
  readFallbackPolicy,
  readFallbackStatus
};
