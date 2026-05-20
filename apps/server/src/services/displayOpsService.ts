import {
  resolveDisplayFaultTriageSummaryFromDisplayOps
} from "@solar-display/shared";
import type {
  DisplayOpsAssetReference,
  DisplayOpsAssetReferenceSummary,
  DisplayOpsBlockingIssue,
  DisplayOpsPageSummary,
  DisplayOpsSummary,
  DisplayPageKey,
  PlaybackPage
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { computeDisplayPageAssetHealthReport, collectDisplayPageAssetReferences } from "./displayPageAssetService.js";
import { readDisplayRotationPreview, readPlaybackPages } from "./displayRotationService.js";

type StageConfigRow = {
  config_json: string;
  page_key: DisplayPageKey;
  published_at: string | null;
  stage: "draft" | "live";
  version: number;
};

type ImageAssetRow = {
  id: number;
  included_in_slideshow: number;
  is_cover: number;
};

type MqttStatusLike = {
  connected: boolean;
  reason: string | null;
};

function parseRegions(raw: string | null | undefined) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function readStageRows() {
  return getDatabase()
    .prepare(
      `
        SELECT page_key, stage, config_json, version, published_at
        FROM display_page_stage_configs
      `
    )
    .all() as StageConfigRow[];
}

function buildIssue(args: {
  assetId?: number | null;
  code: DisplayOpsBlockingIssue["code"];
  message: string;
  pageId?: DisplayPageKey;
  severity?: DisplayOpsBlockingIssue["severity"];
}) {
  return {
    assetId: args.assetId ?? null,
    code: args.code,
    message: args.message,
    pageId: args.pageId,
    severity: args.severity ?? "blocking"
  } satisfies DisplayOpsBlockingIssue;
}

function buildPageSummaries(
  pages: PlaybackPage[],
  mqttStatus: MqttStatusLike
): DisplayOpsPageSummary[] {
  const preview = readDisplayRotationPreview({ mqttStatus });
  const skippedByPageId = new Map(preview.skippedPages.map((page) => [page.id, page]));
  const stageByKey = new Map<string, Partial<Record<"draft" | "live", StageConfigRow>>>();

  for (const row of readStageRows()) {
    const stages = stageByKey.get(row.page_key) ?? {};
    stages[row.stage] = row;
    stageByKey.set(row.page_key, stages);
  }

  return pages.map((page) => {
    const pageId = page.pageKey as DisplayPageKey;
    const stageRows = stageByKey.get(page.pageKey) ?? {};
    const live = stageRows.live ?? null;
    const draft = stageRows.draft ?? null;
    const skipped = skippedByPageId.get(page.id) ?? null;
    const assetFinding = computeDisplayPageAssetHealthReport().findings.find(
      (finding) => finding.pageId === pageId
    );
    const draftPending = Boolean(draft && (!live || draft.version > live.version));
    const publishState = !live && draft
      ? "draft-only"
      : draftPending
        ? "draft-pending"
        : live?.published_at
          ? "live"
          : "unconfigured";
    const blockingIssues: DisplayOpsBlockingIssue[] = [];

    if (draftPending) {
      blockingIssues.push(
        buildIssue({
          code: "draft-pending",
          message: `${page.labelZh} 有未發布 draft 版本`,
          pageId,
          severity: "warning"
        })
      );
    }

    if (skipped?.skipReason) {
      const mappedIssueCode =
        skipped.skipReason === "asset-unhealthy"
          ? "asset-unhealthy"
          : skipped.skipReason === "data-not-ready"
            ? "data-not-ready"
            : skipped.skipReason === "derived-metric-missing"
              ? "derived-metric-missing"
              : skipped.skipReason === "mqtt-mapping-missing"
                ? "mqtt-mapping-missing"
                : skipped.skipReason === "slot-binding-conflict"
                  ? "slot-binding-conflict"
                  : skipped.skipReason === "slot-binding-missing"
                    ? "slot-binding-missing"
                    : skipped.skipReason === "stale-runtime"
                      ? "stale-runtime"
                      : skipped.skipReason === "unpublished"
                        ? "unpublished"
                        : "skip-active";
      blockingIssues.push(
        buildIssue({
          code: mappedIssueCode,
          message: skipped.detail ?? `${page.labelZh} 目前不會進入正式輪播`,
          pageId,
          severity: skipped.skipReason === "disabled" ? "warning" : "blocking"
        })
      );
    }

    if (assetFinding) {
      blockingIssues.push(
        buildIssue({
          assetId: typeof assetFinding.assetId === "number" ? assetFinding.assetId : null,
          code: "asset-unhealthy",
          message: assetFinding.message,
          pageId
        })
      );
    }

    return {
      blockingIssues,
      draftPending,
      draftVersion: draft?.version ?? null,
      labelEn: page.labelEn,
      labelZh: page.labelZh,
      liveVersion: live?.version ?? null,
      pageId,
      publishState,
      route: page.route,
      skipDetail: skipped?.detail ?? null,
      skipReason: skipped?.skipReason ?? null,
      skipState: skipped ? "skipped" : "playable"
    };
  });
}

function buildAssetReferenceSummary(assetId: number): DisplayOpsAssetReferenceSummary {
  const stageReferences: DisplayOpsAssetReference[] = [];

  for (const row of readStageRows()) {
    const references = collectDisplayPageAssetReferences(row.page_key, parseRegions(row.config_json));
    references
      .filter((reference) => Number(reference.assetId) === assetId)
      .forEach((reference) => {
        stageReferences.push({
          bindingId: reference.bindingId,
          kind: "display-page",
          message: `${row.page_key} ${row.stage} 引用了此素材`,
          pageId: row.page_key,
          stage: row.stage,
          targetLabel: `${row.page_key}:${reference.bindingId}`
        });
      });
  }

  const assetRow = getDatabase()
    .prepare("SELECT id, included_in_slideshow, is_cover FROM image_assets WHERE id = ?")
    .get(assetId) as ImageAssetRow | undefined;
  const playlistTableExists = Boolean(
    getDatabase()
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = 'image_playlist_entries'
        `
      )
      .get()
  );
  const enabledPlaylistEntries = playlistTableExists
    ? (getDatabase()
        .prepare(
          `
            SELECT entry_id, enabled
            FROM image_playlist_entries
            WHERE asset_id = ?
            ORDER BY display_order ASC, entry_id ASC
          `
        )
        .all(assetId) as Array<{
        enabled: number;
        entry_id: string;
      }>)
    : [];

  const activePlaylistEntries = enabledPlaylistEntries.filter((entry) => entry.enabled === 1);
  if (activePlaylistEntries.length > 0) {
    activePlaylistEntries.forEach((entry) => {
      stageReferences.push({
        bindingId: entry.entry_id,
        kind: "slideshow",
        message: "此素材目前仍在啟用中的 playlist runtime 內",
        pageId: null,
        stage: "live",
        targetLabel: entry.entry_id
      });
    });
  } else if (enabledPlaylistEntries.length === 0 && assetRow?.included_in_slideshow === 1) {
    stageReferences.push({
      bindingId: null,
      kind: "slideshow",
      message: "此素材目前已納入 slideshow",
      pageId: null,
      stage: "live",
      targetLabel: "slideshow"
    });
  }

  if (assetRow?.is_cover === 1) {
    stageReferences.push({
      bindingId: null,
      kind: "cover",
      message: "此素材目前是封面圖片",
      pageId: null,
      stage: "live",
      targetLabel: "cover"
    });
  }

  const liveCount = stageReferences.filter((reference) => reference.stage === "live").length;
  const draftCount = stageReferences.filter((reference) => reference.stage === "draft").length;
  const hasBlockingLiveDisplayReference = stageReferences.some(
    (reference) => reference.kind === "display-page" && reference.stage === "live"
  );
  const hasBlockingPlaylistReference = stageReferences.some(
    (reference) =>
      reference.stage === "live" &&
     reference.kind === "slideshow" &&
     !(reference.bindingId === null && reference.targetLabel === "slideshow")
  );
  const hasBlockingCoverReference = stageReferences.some(
   (reference) => reference.stage === "live" && reference.kind === "cover"
  );
  const blockingIssues = [
    ...(hasBlockingLiveDisplayReference
      ? [
          buildIssue({
            assetId,
            code: "live-reference",
            message: "Asset is still referenced by a live display surface",
            severity: "blocking"
          })
        ]
      : []),
    ...(hasBlockingPlaylistReference
      ? [
          buildIssue({
            assetId,
            code: "live-reference",
            message: "Asset is still referenced by live playlist usage",
            severity: "blocking"
          })
        ]
      : []),
    ...(hasBlockingCoverReference
      ? [
          buildIssue({
            assetId,
            code: "live-reference",
            message: "Asset is still referenced by the live cover image",
            severity: "blocking"
          })
        ]
      : [])
  ];

  return {
    assetId,
    blockingIssues,
    draftCount,
    liveCount,
    references: stageReferences
  };
}

export function readDisplayOpsSummary(options: { mqttStatus: MqttStatusLike }): DisplayOpsSummary {
  const pages = buildPageSummaries(readPlaybackPages(), options.mqttStatus);
  const livePages = pages.filter((page) => page.liveVersion !== null);
  const blockingIssues = pages.flatMap((page) => page.blockingIssues);

  return {
    blockingIssues,
    draftCount: pages.filter((page) => page.draftPending).length,
    draftPending: pages.some((page) => page.draftPending),
    generatedAt: new Date().toISOString(),
    lastPublishAt: readStageRows()
      .map((row) => row.published_at)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? null,
    liveVersion: livePages.reduce(
      (maxVersion, page) => Math.max(maxVersion, page.liveVersion ?? 0),
      0
    ) || null,
    pages,
    skipCount: pages.filter((page) => page.skipState === "skipped").length,
    triageSummary: resolveDisplayFaultTriageSummaryFromDisplayOps({
      blockingIssues
    })
  };
}

export function readDisplayOpsAssetReferences(assetId: number) {
  return buildAssetReferenceSummary(assetId);
}
