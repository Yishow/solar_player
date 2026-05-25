import type {
  ConfigStage,
  DisplayPageId,
  DisplayPageFallbackStatus,
  DisplayPageConfigEnvelope,
  DisplayPageFreeformObject,
  ManagementDraftSaveConflict,
  FallbackPolicy,
  FallbackStatusItem,
  PublishHistoryEntry,
  ValidationFinding,
  ValidationResult
} from "@solar-display/shared";
import {
  defaultFallbackPolicy,
  isDisplayPageCardRail,
  isDisplayPageCardRailTemplateKey,
  normalizeDisplayPageFreeformObjects,
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
import { validateDisplayPageObjectDraft } from "./displayPageObjectValidation.js";

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

type WriteStageConfigOptions = {
  baseVersion?: number;
};

export class ManagementDraftSaveConflictError extends Error {
  readonly code = "management_draft_conflict";
  readonly conflict: ManagementDraftSaveConflict<DisplayPageConfigEnvelope>;
  readonly statusCode = 409;

  constructor(conflict: ManagementDraftSaveConflict<DisplayPageConfigEnvelope>) {
    super("Draft save conflict");
    this.name = "ManagementDraftSaveConflictError";
    this.conflict = conflict;
  }
}

function parseRegions(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if ("regions" in parsed && parsed.regions && typeof parsed.regions === "object" && !Array.isArray(parsed.regions)) {
        return parsed.regions as Record<string, unknown>;
      }
      return parsed as Record<string, unknown>;
    }
  } catch { /* fall through */ }
  return {};
}

function parseFreeformObjects(raw: string | null | undefined): DisplayPageFreeformObject[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.freeformObjects)) {
      return normalizeDisplayPageFreeformObjects(parsed.freeformObjects);
    }
  } catch {
    return [];
  }

  return [];
}

function serializeDisplayPageConfigPayload(
  regions: Record<string, unknown>,
  freeformObjects: DisplayPageFreeformObject[]
) {
  return JSON.stringify({
    freeformObjects,
    regions
  });
}

function toEnvelope(
  pageId: DisplayPageId,
  stage: ConfigStage,
  row: StageConfigRow | undefined
): DisplayPageConfigEnvelope {
  if (!row) {
    return {
      freeformObjects: [],
      pageId,
      regions: {},
      updatedAt: null,
      version: 1,
      stage,
      fallbackPolicy: resolveDisplayPageFallbackPolicyByPageId(pageId)
    };
  }
  return {
    freeformObjects: parseFreeformObjects(row.config_json),
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

function writeStageConfig(
  pageId: DisplayPageId,
  stage: ConfigStage,
  regions: Record<string, unknown>,
  freeformObjects: DisplayPageFreeformObject[] = [],
  options: WriteStageConfigOptions = {}
): DisplayPageConfigEnvelope {
  const db = getDatabase();
  const current = readStageConfig(pageId, stage);

  if (stage === "draft") {
    if (typeof options.baseVersion !== "number" || !Number.isInteger(options.baseVersion) || options.baseVersion < 1) {
      const error = new Error("baseVersion must be a positive integer");
      // @ts-expect-error fastify reads statusCode
      error.statusCode = 400;
      throw error;
    }

    if (current.version !== options.baseVersion) {
      throw new ManagementDraftSaveConflictError({
        baseVersion: options.baseVersion,
        currentVersion: current.version,
        latestEnvelope: current,
        resourceId: pageId,
        resourceType: "display-page-draft"
      });
    }
  }

  const normalizedRegions = normalizeDisplayPageRegionsForStorage(regions);
  const normalizedFreeformObjects = normalizeDisplayPageFreeformObjects(freeformObjects);
  const nextVersion = current.version + 1;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(page_key, stage) DO UPDATE SET
       config_json = excluded.config_json,
       version = excluded.version,
       updated_at = excluded.updated_at`
  ).run(pageId, stage, serializeDisplayPageConfigPayload(normalizedRegions, normalizedFreeformObjects), nextVersion, now);
  return readStageConfig(pageId, stage);
}

function readNextLiveVersion(pageId: DisplayPageId) {
  return readStageConfig(pageId, "live").version + 1;
}

type LayoutRect = {
  bottom: number;
  height: number;
  left: number;
  regionId: string;
  right: number;
  top: number;
  width: number;
};

function pushGeometryValidationFindings(
  findings: ValidationFinding[],
  regionId: string,
  rect: {
    height: number;
    left: number;
    top: number;
    width: number;
  }
) {
  if (rect.left + rect.width > 1920) {
    findings.push({
      severity: "blocking",
      code: "GEOMETRY_OUT_OF_BOUNDS",
      message: `${regionId} 超出畫布右邊界 (1920px)`,
      regionId
    });
  }
  if (rect.top + rect.height > 1080) {
    findings.push({
      severity: "blocking",
      code: "GEOMETRY_OUT_OF_BOUNDS",
      message: `${regionId} 超出畫布底邊界 (1080px)`,
      regionId
    });
  }
  if (rect.left < 0) {
    findings.push({
      severity: "blocking",
      code: "GEOMETRY_OUT_OF_BOUNDS",
      message: `${regionId} 超出畫布左邊界`,
      regionId
    });
  }
  if (rect.top < 0) {
    findings.push({
      severity: "blocking",
      code: "GEOMETRY_OUT_OF_BOUNDS",
      message: `${regionId} 超出畫布上邊界`,
      regionId
    });
  }
  if (rect.width <= 0) {
    findings.push({
      severity: "blocking",
      code: "GEOMETRY_INVALID_VALUE",
      message: `${regionId}.width 必須大於 0`,
      regionId
    });
  }
  if (rect.height <= 0) {
    findings.push({
      severity: "blocking",
      code: "GEOMETRY_INVALID_VALUE",
      message: `${regionId}.height 必須大於 0`,
      regionId
    });
  }
}

function pushLayoutRect(layoutRects: LayoutRect[], regionId: string, rect: {
  height: number;
  left: number;
  top: number;
  width: number;
}) {
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  layoutRects.push({
    bottom: rect.top + rect.height,
    height: rect.height,
    left: rect.left,
    regionId,
    right: rect.left + rect.width,
    top: rect.top,
    width: rect.width
  });
}

function validateCardRailContent(
  findings: ValidationFinding[],
  regionId: string,
  card: {
    contentSource: {
      mode: string;
      payload?: Record<string, unknown>;
    };
    template: string;
    visible: boolean;
  }
) {
  if (!card.visible) {
    return;
  }

  if (!isDisplayPageCardRailTemplateKey(card.template)) {
    findings.push({
      severity: "blocking",
      code: "CARD_RAIL_TEMPLATE_UNKNOWN",
      message: `${regionId} 使用未支援的 card rail template`,
      regionId
    });
    return;
  }

  if (card.contentSource.mode !== "static") {
    findings.push({
      severity: "blocking",
      code: "CARD_RAIL_TEMPLATE_REQUIRED",
      message: `${regionId} 缺少可渲染的 static content payload`,
      regionId
    });
    return;
  }

  if (card.template === "metric-highlight") {
    const payload = card.contentSource.payload ?? {};
    const label = typeof payload.label === "string" ? payload.label.trim() : "";
    const unit = typeof payload.unit === "string" ? payload.unit.trim() : "";
    const value = typeof payload.value === "string" ? payload.value.trim() : "";

    if (label.length === 0 || unit.length === 0 || value.length === 0) {
      findings.push({
        severity: "blocking",
        code: "CARD_RAIL_TEMPLATE_REQUIRED",
        message: `${regionId} 缺少 metric-highlight 模板必填欄位`,
        regionId
      });
    }
    return;
  }

  if (card.template === "household-equivalent") {
    const payload = card.contentSource.payload ?? {};
    const eyebrow = typeof payload.eyebrow === "string" ? payload.eyebrow.trim() : "";
    const householdCountDisplay =
      typeof payload.householdCountDisplay === "string"
        ? payload.householdCountDisplay.trim()
        : "";
    const householdLabel =
      typeof payload.householdLabel === "string" ? payload.householdLabel.trim() : "";
    const supportingLine =
      typeof payload.supportingLine === "string" ? payload.supportingLine.trim() : "";

    if (
      eyebrow.length === 0 ||
      householdCountDisplay.length === 0 ||
      householdLabel.length === 0 ||
      supportingLine.length === 0
    ) {
      findings.push({
        severity: "blocking",
        code: "CARD_RAIL_TEMPLATE_REQUIRED",
        message: `${regionId} 缺少 household-equivalent 模板必填欄位`,
        regionId
      });
    }
  }
}

function validateCardRail(
  findings: ValidationFinding[],
  layoutRects: LayoutRect[],
  regionId: string,
  rail: {
    cards: Array<{
      contentSource: {
        mode: string;
        payload?: Record<string, unknown>;
      };
      frame: {
        height: number;
        left: number;
        top: number;
        width: number;
      };
      id: string;
      template: string;
      visible: boolean;
    }>;
    container: {
      height: number;
      left: number;
      top: number;
      width: number;
    };
  }
) {
  pushGeometryValidationFindings(findings, regionId, rail.container);
  pushLayoutRect(layoutRects, regionId, rail.container);

  for (const card of rail.cards) {
    if (!card.visible) {
      continue;
    }

    const cardRegionId = `${regionId}.cards.${card.id}`;
    const { frame } = card;

    if (frame.left < 0 || frame.top < 0 || frame.width <= 0 || frame.height <= 0) {
      findings.push({
        severity: "blocking",
        code: "CARD_RAIL_OUT_OF_BOUNDS",
        message: `${cardRegionId} 具有無效 frame`,
        regionId: cardRegionId
      });
    }

    if (
      frame.left + frame.width > rail.container.width ||
      frame.top + frame.height > rail.container.height
    ) {
      findings.push({
        severity: "blocking",
        code: "CARD_RAIL_OUT_OF_BOUNDS",
        message: `${cardRegionId} 超出 rail 邊界`,
        regionId: cardRegionId
      });
    }

    validateCardRailContent(findings, cardRegionId, card);
  }
}

function validateConfigDraft(
  regions: Record<string, unknown>,
  freeformObjects: DisplayPageFreeformObject[] = []
): ValidationResult {
  const findings: ValidationFinding[] = [];
  const placementIssues = collectDisplayPageMediaPlacementIssues(regions);
  const layoutRects: LayoutRect[] = [];

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
    if (isDisplayPageCardRail(value)) {
      validateCardRail(findings, layoutRects, regionId, value);
      continue;
    }

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
        pushLayoutRect(layoutRects, regionId, {
          height: nHeight,
          left: nLeft,
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

  const objectValidation = validateDisplayPageObjectDraft(freeformObjects);
  if (objectValidation.findings.length > 0) {
    findings.push(...objectValidation.findings);
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
  const validation = validateConfigDraft(draft.regions, draft.freeformObjects ?? []);

  if (!validation.canPublish) {
    return { live: readStageConfig(pageId, "live"), validation };
  }

  const imageWarnings = checkImageReferences(draft.regions);
  if (imageWarnings.length > 0) {
    validation.findings.push(...imageWarnings);
  }
  const assetWarnings = collectDisplayPageAssetFindings(
    pageId,
    draft.regions,
    draft.freeformObjects ?? []
  ).map((finding) => ({
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
  const serializedRegions = serializeDisplayPageConfigPayload(draft.regions, draft.freeformObjects ?? []);

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
  const freeformObjects = parseFreeformObjects(historyRow.config_json);
  const newVersion = readNextLiveVersion(pageId);
  const now = new Date().toISOString();
  const serializedRegions = serializeDisplayPageConfigPayload(regions, freeformObjects);

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
  const assetFindings = collectDisplayPageAssetFindings(
    pageId,
    live.regions,
    live.freeformObjects ?? []
  );
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
