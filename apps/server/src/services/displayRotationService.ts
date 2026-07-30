import type {
  DisplayReadinessFinding,
  DisplayPageKey,
  DisplayPageTemplateKey,
  DisplayRotationPageCondition,
  DisplayRotationPlan,
  DisplayRotationPreview,
  FallbackPolicy,
  PlaybackPage,
  PlaybackSettings,
  SiteScope
} from "@solar-display/shared";
import {
  buildDisplayRotationPlan,
  evaluateDisplayRotation,
  isPlaybackAllowedBySchedule,
  normalizePlaybackTransitionSpeed,
  resolveImagesPlaylistTotalDurationSeconds,
  resolveLiveMetricRequirementsForPage,
  resolveDisplayPageFallbackPolicyByPageId
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readImagePlaylist } from "./imagePlaylistService.js";
import {
  readDefaultPlaybackProfileId,
  readDefaultPlaybackPageRows,
  readDefaultPlaybackSettingsRow,
  readPlaybackProfilePageRows,
  readPlaybackProfileSettingsRow,
  writeDefaultPlaybackSettingsRow,
  updateDefaultPlaybackPageState,
  type PlaybackProfilePageRow,
  type PlaybackProfileSettingsRow
} from "./playbackProfileService.js";
import {
  readGlobalPlaybackRuntimePolicyRow,
  writeGlobalPlaybackRuntimePolicyRow,
  type PlaybackRuntimePolicyRow
} from "./playbackRuntimePolicyService.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { collectDisplayPageAssetFindings } from "./displayPageAssetService.js";
import { readDisplayReadinessReport } from "./displayReadinessService.js";
import { evaluatePageFreshnessForRequirements } from "./freshnessPolicyService.js";
import {
  createEffectiveRotationCacheKey,
  EffectiveRotationCache
} from "./effectiveRotationCache.js";
import { createHash } from "node:crypto";

type StageConfigRow = {
  config_json: string;
  page_key: string;
  published_at: string | null;
};

type MqttStatusLike = {
  connected: boolean;
  reason: string | null;
};

const liveDataPageKeys = new Set<DisplayPageKey>([
  "overview",
  "solar",
  "factory-circuit",
  "factory-circuit-guanyin",
  "sustainability"
]);

function buildReadinessFindingsByPageKey(
  siteScope?: SiteScope,
  readinessReport = readDisplayReadinessReport({ siteScope })
) {
  const byPageKey = new Map<DisplayPageKey, DisplayReadinessFinding[]>();

  for (const finding of readinessReport.findings) {
    if (!finding.blocking || !liveDataPageKeys.has(finding.pageId)) {
      continue;
    }

    const findings = byPageKey.get(finding.pageId) ?? [];
    findings.push(finding);
    byPageKey.set(finding.pageId, findings);
  }

  return byPageKey;
}

function resolveReadinessFindingPriority(finding: DisplayReadinessFinding) {
  if (finding.sourceType === "circuit-slot" && finding.reason.startsWith("slot conflict")) {
    return 0;
  }

  if (finding.sourceType === "circuit-slot") {
    return 1;
  }

  if (finding.sourceType === "mqtt-metric") {
    return 2;
  }

  if (finding.sourceType === "derived-metric") {
    return 3;
  }

  return 4;
}

function resolveReadinessSkipReason(findings: DisplayReadinessFinding[]) {
  const dominantFinding = [...findings].sort((left, right) => {
    const priorityDelta =
      resolveReadinessFindingPriority(left) - resolveReadinessFindingPriority(right);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.requirementKey.localeCompare(right.requirementKey);
  })[0];

  if (!dominantFinding) {
    return null;
  }

  if (dominantFinding.sourceType === "circuit-slot") {
    return dominantFinding.reason.startsWith("slot conflict")
      ? {
          detail: dominantFinding.reason,
          skipReason: "slot-binding-conflict"
        }
      : {
          detail: dominantFinding.reason,
          skipReason: "slot-binding-missing"
        };
  }

  if (dominantFinding.sourceType === "derived-metric") {
    return {
      detail: dominantFinding.reason,
      skipReason: "derived-metric-missing"
    };
  }

  return {
    detail: dominantFinding.reason,
    skipReason: "mqtt-mapping-missing"
  };
}

function resolveRuntimeDataCondition(args: {
  enforceFreshRuntimeData: boolean;
  fallbackPolicy: FallbackPolicy;
  hasAllRequiredMetrics: boolean;
  mqttStatus: MqttStatusLike;
  pageRequiresLiveData: boolean;
  pageFresh: boolean;
  stalestMetricKey: string | null;
  stalestTimestamp: string | null;
}) {
  if (!args.pageRequiresLiveData) {
    return null;
  }

  if (!args.enforceFreshRuntimeData) {
    return null;
  }

  if (args.mqttStatus.reason === "mock") {
    return args.fallbackPolicy.staleData === "hide"
      ? {
          detail: "目前為 mock mode，但此頁 fallback policy 不允許以 degraded runtime 播放。",
          skipReason: "stale-runtime"
        }
      : null;
  }

  if (args.pageFresh) {
    return null;
  }

  if (!args.hasAllRequiredMetrics) {
    return {
      detail: "尚未收到此頁所需的完整即時資料",
      skipReason: "stale-runtime"
    };
  }

  return null;
}

function resolveAssetCondition(args: {
  assetMessage: string | null;
  fallbackPolicy: FallbackPolicy;
  hasAssetFindings: boolean;
}) {
  if (!args.hasAssetFindings) {
    return null;
  }

  return args.fallbackPolicy.missingAsset === "hide"
    ? {
        detail: args.assetMessage,
        isHealthy: false
      }
    : null;
}

export type PlaybackPageUpdateInput = {
  id: number;
  enabled?: boolean;
  displayOrder?: number;
  durationSeconds?: number;
};

function toBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function parseRepeatDays(raw: string | null): number[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((token) => Number.parseInt(token.trim(), 10))
    .filter((day) => Number.isFinite(day));
}

function serializeRepeatDays(days: number[]): string {
  return days.filter((day) => day >= 0 && day <= 6).join(",");
}

function serializeSettingsRows(
  profile: PlaybackProfileSettingsRow,
  runtimePolicy: PlaybackRuntimePolicyRow
): PlaybackSettings {
  return {
    autoplay: toBoolean(profile.autoplay),
    brightness: profile.brightness,
    idleMode: profile.idle_mode === "return-to-start" ? "return-to-start" : "disabled",
    idleTimeout: profile.idle_timeout,
    loop: toBoolean(profile.loop),
    orientation: profile.orientation === "portrait" ? "portrait" : "landscape",
    repeatDays: parseRepeatDays(profile.repeat_days),
    scheduleEnabled: toBoolean(profile.schedule_enabled),
    scheduleEnd: profile.schedule_end,
    scheduleStart: profile.schedule_start,
    startPage: profile.start_page,
    enforceFreshRuntimeData: toBoolean(runtimePolicy.enforce_fresh_runtime_data),
    transitionSpeed: normalizePlaybackTransitionSpeed(
      runtimePolicy.transition_speed,
      runtimePolicy.transition_type === "none"
    ),
    transitionType: runtimePolicy.transition_type,
    updatedAt:
      profile.updated_at === null || runtimePolicy.updated_at === null
        ? profile.updated_at ?? runtimePolicy.updated_at
        : profile.updated_at > runtimePolicy.updated_at
          ? profile.updated_at
          : runtimePolicy.updated_at
  };
}

function serializePageRow(row: PlaybackProfilePageRow): PlaybackPage {
  return {
    displayOrder: row.display_order,
    durationSeconds: row.duration_seconds,
    enabled: toBoolean(row.enabled),
    id: row.id,
    labelEn: row.label_en,
    labelZh: row.label_zh,
    pageKey: row.page_key,
    route: `/${row.route_slug}`,
    templateKey: row.template_key
  };
}

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
    // ignore malformed config rows in diagnostics
  }

  return {};
}

export function readPlaybackSettings(
  profileId = readDefaultPlaybackProfileId()
) {
  return serializeSettingsRows(
    readPlaybackProfileSettingsRow(profileId),
    readGlobalPlaybackRuntimePolicyRow()
  );
}

export function updatePlaybackSettings(body: Partial<PlaybackSettings>) {
  const currentProfile = readDefaultPlaybackSettingsRow();
  const currentRuntimePolicy = readGlobalPlaybackRuntimePolicyRow();
  const nextTransitionType =
    body.transitionType === "fade" || body.transitionType === "slide" || body.transitionType === "none"
      ? body.transitionType
      : currentRuntimePolicy.transition_type;
  const requestedTransitionSpeed =
    typeof body.transitionSpeed === "number"
      ? body.transitionSpeed
      : currentRuntimePolicy.transition_speed;
  const nextSettings = {
    autoplay: body.autoplay ?? toBoolean(currentProfile.autoplay),
    brightness:
      typeof body.brightness === "number"
        ? Math.min(100, Math.max(0, body.brightness))
        : currentProfile.brightness,
    idleMode:
      body.idleMode === "return-to-start"
        ? "return-to-start"
        : body.idleMode === undefined
          ? currentProfile.idle_mode
          : "disabled",
    idleTimeout:
      typeof body.idleTimeout === "number"
        ? Math.max(1, body.idleTimeout)
        : currentProfile.idle_timeout,
    loop: body.loop ?? toBoolean(currentProfile.loop),
    orientation:
      body.orientation === "portrait"
        ? "portrait"
        : body.orientation === undefined
          ? currentProfile.orientation
          : "landscape",
    repeatDays: body.repeatDays ?? parseRepeatDays(currentProfile.repeat_days),
    scheduleEnabled: body.scheduleEnabled ?? toBoolean(currentProfile.schedule_enabled),
    scheduleEnd:
      body.scheduleEnd === undefined ? currentProfile.schedule_end : body.scheduleEnd,
    scheduleStart:
      body.scheduleStart === undefined ? currentProfile.schedule_start : body.scheduleStart,
    startPage:
      typeof body.startPage === "number" ? body.startPage : currentProfile.start_page,
    enforceFreshRuntimeData:
      body.enforceFreshRuntimeData ??
      toBoolean(currentRuntimePolicy.enforce_fresh_runtime_data),
    transitionSpeed: normalizePlaybackTransitionSpeed(
      requestedTransitionSpeed,
      nextTransitionType === "none"
    ),
    transitionType: nextTransitionType
  };

  getDatabase().transaction(() => {
    writeDefaultPlaybackSettingsRow({
      autoplay: nextSettings.autoplay ? 1 : 0,
      brightness: nextSettings.brightness,
      idle_mode: nextSettings.idleMode,
      idle_timeout: nextSettings.idleTimeout,
      loop: nextSettings.loop ? 1 : 0,
      orientation: nextSettings.orientation,
      repeat_days: serializeRepeatDays(nextSettings.repeatDays),
      schedule_enabled: nextSettings.scheduleEnabled ? 1 : 0,
      schedule_end: nextSettings.scheduleEnd,
      schedule_start: nextSettings.scheduleStart,
      start_page: nextSettings.startPage
    });
    writeGlobalPlaybackRuntimePolicyRow({
      enforce_fresh_runtime_data: nextSettings.enforceFreshRuntimeData ? 1 : 0,
      transition_speed: nextSettings.transitionSpeed,
      transition_type: nextSettings.transitionType
    });
  })();

  return readPlaybackSettings();
}

export function readPlaybackPages(
  profileId = readDefaultPlaybackProfileId()
) {
  return readPlaybackProfilePageRows(profileId).map(serializePageRow);
}

function readLiveStageRows() {
  return getDatabase()
    .prepare(
      `
        SELECT
          page_key,
          config_json,
          published_at
        FROM display_page_stage_configs
        WHERE stage = 'live'
      `
    )
    .all() as StageConfigRow[];
}

function buildPageConditions(
  pages: PlaybackPage[],
  mqttStatus: MqttStatusLike,
  now: Date,
  settings: PlaybackSettings,
  siteScope?: SiteScope,
  readinessReport = readDisplayReadinessReport({ now, siteScope })
) {
  const liveStageByPage = new Map(
    readLiveStageRows().map((row) => [row.page_key, row] satisfies [string, StageConfigRow])
  );
  const liveMetrics = readLiveMetricsSnapshot(getDatabase());
  const readinessFindingsByPageKey = buildReadinessFindingsByPageKey(
    siteScope,
    readinessReport
  );
  const pageConditions: Record<number, DisplayRotationPageCondition> = {};

  for (const page of pages) {
    const liveStage = liveStageByPage.get(page.pageKey);
    const assetFindings = liveStage
      ? collectDisplayPageAssetFindings(page.pageKey, parseRegions(liveStage.config_json))
      : [];
    const fallbackPolicy = resolveDisplayPageFallbackPolicyByPageId(
      page.pageKey,
      page.templateKey ?? null
    );
    const pageRequiresLiveData = liveDataPageKeys.has(page.pageKey as DisplayPageKey);
    const requiredMetricRequirements =
      page.templateKey === undefined
        ? []
        : resolveLiveMetricRequirementsForPage(
            page.pageKey as DisplayPageKey,
            siteScope
          );
    const runtimeFreshness = page.templateKey === undefined
      ? {
          fresh: true,
          hasRequiredData: true,
          metricKey: null,
          sourceTimestamp: null,
          state: "live" as const
        }
      : evaluatePageFreshnessForRequirements({
          metrics: liveMetrics.metrics,
          nowMs: now.getTime(),
          requirements: requiredMetricRequirements
        });
    const readinessCondition =
      page.templateKey === undefined
        ? null
        : resolveReadinessSkipReason(
            readinessFindingsByPageKey.get(page.pageKey as DisplayPageKey) ?? []
          );
    const runtimeDataCondition = resolveRuntimeDataCondition({
      enforceFreshRuntimeData: settings.enforceFreshRuntimeData,
      fallbackPolicy,
      hasAllRequiredMetrics: runtimeFreshness.hasRequiredData,
      mqttStatus,
      pageFresh: runtimeFreshness.fresh,
      pageRequiresLiveData,
      stalestMetricKey: runtimeFreshness.metricKey,
      stalestTimestamp: runtimeFreshness.sourceTimestamp
    });
    const assetCondition = resolveAssetCondition({
      assetMessage: assetFindings[0]?.message ?? null,
      fallbackPolicy,
      hasAssetFindings: assetFindings.length > 0
    });
    const dominantSkipReason =
      readinessCondition?.skipReason ?? runtimeDataCondition?.skipReason ?? null;
    const dominantDetail =
      readinessCondition?.detail ?? runtimeDataCondition?.detail ?? assetCondition?.detail ?? null;
    const isReady =
      readinessCondition === null &&
      (!pageRequiresLiveData ||
        !settings.enforceFreshRuntimeData ||
        runtimeFreshness.fresh ||
        mqttStatus.reason === "mock" ||
        runtimeFreshness.hasRequiredData);

    pageConditions[page.id] = {
      detail: dominantDetail,
      isHealthy: assetCondition?.isHealthy ?? assetFindings.length === 0,
      isPublished:
        liveStage === undefined ||
        liveStage.published_at !== null ||
        Object.keys(parseRegions(liveStage.config_json)).length === 0,
      isReady,
      skipReason: dominantSkipReason
    };
  }

  return pageConditions;
}

export function updatePlaybackPages(pages: PlaybackPageUpdateInput[]) {
  const database = getDatabase();
  const pageKeysById = new Map(
    readDefaultPlaybackPageRows({ includeArchived: true }).map((page) => [page.id, page.page_key])
  );

  database.transaction((inputs: PlaybackPageUpdateInput[]) => {
    for (const page of inputs) {
      const pageKey = pageKeysById.get(page.id);
      if (!pageKey) {
        continue;
      }

      updateDefaultPlaybackPageState(pageKey, {
        displayOrder: typeof page.displayOrder === "number" ? page.displayOrder : 0,
        durationSeconds:
          typeof page.durationSeconds === "number" ? Math.max(1, page.durationSeconds) : 15,
        enabled: page.enabled !== false
      });
    }
  })(pages);

  return readPlaybackPages();
}

export function readDisplayRotationPlan(): DisplayRotationPlan {
  return buildDisplayRotationPlan(readPlaybackPages());
}

export function updateDisplayRotationPlan(pages: PlaybackPageUpdateInput[]) {
  updatePlaybackPages(pages);
  return readDisplayRotationPlan();
}

function resolveRotationPages(profileId = readDefaultPlaybackProfileId()) {
  const pages = readPlaybackPages(profileId);
  const imagesDurationSeconds = resolveImagesPlaylistTotalDurationSeconds(
    readImagePlaylist().entries
  );

  if (imagesDurationSeconds <= 0) {
    return pages;
  }

  return pages.map((page) => (
    page.templateKey === "images"
      ? {
          ...page,
          durationSeconds: imagesDurationSeconds
        }
      : page
  ));
}

export function readDisplayRotationPreview(options: {
  mqttStatus: MqttStatusLike;
  now?: Date;
  profileId?: number;
  siteScope?: SiteScope;
}): DisplayRotationPreview {
  const now = options.now ?? new Date();
  const settings = readPlaybackSettings(options.profileId);
  const pages = resolveRotationPages(options.profileId);
  const readinessReport = readDisplayReadinessReport({
    now,
    siteScope: options.siteScope
  });

  return evaluateResolvedDisplayRotation({
    mqttStatus: options.mqttStatus,
    now,
    pages,
    readinessReport,
    settings,
    siteScope: options.siteScope
  });
}

export function evaluatePlaybackSnapshot(options: {
  mqttStatus: MqttStatusLike;
  now?: Date;
  pages: PlaybackPage[];
  settings: PlaybackSettings;
  siteScope?: SiteScope;
}): DisplayRotationPreview {
  const now = options.now ?? new Date();
  return evaluateResolvedDisplayRotation({
    mqttStatus: options.mqttStatus,
    now,
    pages: options.pages,
    readinessReport: readDisplayReadinessReport({
      now,
      siteScope: options.siteScope
    }),
    settings: options.settings,
    siteScope: options.siteScope
  });
}

function evaluateResolvedDisplayRotation(options: {
  mqttStatus: MqttStatusLike;
  now: Date;
  pages: PlaybackPage[];
  readinessReport: ReturnType<typeof readDisplayReadinessReport>;
  settings: PlaybackSettings;
  siteScope?: SiteScope;
}): DisplayRotationPreview {
  const pages = options.pages;
  const excludedPages = options.siteScope
    ? pages.filter(
        (page) =>
          (page.pageKey === "factory-circuit" && options.siteScope !== "cl") ||
          (page.pageKey === "factory-circuit-guanyin" &&
            options.siteScope !== "kn")
      )
    : [];
  const scopedPages =
    excludedPages.length === 0
      ? pages
      : pages.filter(
          (page) =>
            !excludedPages.some((excluded) => excluded.id === page.id)
        );

  const preview = evaluateDisplayRotation({
    fallbackRoute: "/offline",
    now: options.now,
    pageConditions: buildPageConditions(
      scopedPages,
      options.mqttStatus,
      options.now,
      options.settings,
      options.siteScope,
      options.readinessReport
    ),
    pages: scopedPages,
    settings: options.settings
  });

  return excludedPages.length === 0
    ? preview
    : {
        ...preview,
        skippedPages: [
          ...preview.skippedPages,
          ...excludedPages.map((page) => ({
            ...page,
            detail: `Page does not apply to ${options.siteScope} Site Scope`,
            skipReason: "site-scope"
          }))
        ].sort((left, right) => left.displayOrder - right.displayOrder)
      };
}

export type EffectiveDisplayRotationSnapshot = {
  effectiveRotationRevision: string;
  preview: DisplayRotationPreview;
  settings: PlaybackSettings;
};

const effectiveRotationCache =
  new EffectiveRotationCache<EffectiveDisplayRotationSnapshot>();

export function readEffectiveRotationEvaluationCount() {
  return effectiveRotationCache.getEvaluationCount();
}

function createRevision(value: unknown) {
  return createHash("sha256")
    .update(
      // Freshness snapshots carry ageMs, which advances every millisecond. The
      // rotation outcome depends on the freshness state, its source timestamp,
      // and its next transition — all of which are hashed. Including the raw
      // age would give every request a distinct key and defeat the cache.
      JSON.stringify(value, (key, entry) =>
        key === "ageMs" ? undefined : entry
      ),
      "utf8"
    )
    .digest("hex");
}

function readAssetRevision(pages: PlaybackPage[]) {
  const liveStageByPage = new Map(
    readLiveStageRows().map((row) => [row.page_key, row])
  );

  return createRevision(
    pages.map((page) => {
      const liveStage = liveStageByPage.get(page.pageKey);
      return {
        findings: liveStage
          ? collectDisplayPageAssetFindings(
              page.pageKey,
              parseRegions(liveStage.config_json)
            )
          : [],
        pageKey: page.pageKey,
        publishedAt: liveStage?.published_at ?? null
      };
    })
  );
}

function readFreshnessRevision(options: {
  mqttStatus: MqttStatusLike;
  now: Date;
  pages: PlaybackPage[];
  settings: PlaybackSettings;
  siteScope: SiteScope;
}) {
  const metrics = readLiveMetricsSnapshot(getDatabase()).metrics;

  return createRevision({
    enforceFreshRuntimeData: options.settings.enforceFreshRuntimeData,
    // Only the fields that affect freshness. The concrete MqttStatus also
    // carries updatedAt, which churns on every reconnect attempt and would
    // otherwise invalidate the Effective Rotation cache on an unchanged cohort.
    mqttStatus: {
      connected: options.mqttStatus.connected,
      reason: options.mqttStatus.reason
    },
    pages: options.pages.map((page) => ({
      freshness:
        page.templateKey === undefined
          ? null
          : evaluatePageFreshnessForRequirements({
              metrics,
              nowMs: options.now.getTime(),
              requirements: resolveLiveMetricRequirementsForPage(
                page.pageKey as DisplayPageKey,
                options.siteScope
              )
            }),
      pageKey: page.pageKey
    }))
  });
}

function readCachedRotationSnapshot(options: {
  mqttStatus: MqttStatusLike;
  now: Date;
  pages: PlaybackPage[];
  profileId: number;
  profileVersionId?: number;
  settings: PlaybackSettings;
  siteScope: SiteScope;
}): EffectiveDisplayRotationSnapshot {
  const { now, pages, settings } = options;
  const readinessReport = readDisplayReadinessReport({
    now,
    siteScope: options.siteScope
  });
  const profileRevision = createRevision({
    pages,
    scheduleAllowed: isPlaybackAllowedBySchedule(settings, now),
    settings
  });
  const readinessRevision = createRevision({
    assetRevision: readAssetRevision(pages),
    findings: readinessReport.findings,
    pages: readinessReport.pages,
    summary: readinessReport.summary
  });
  const freshnessRevision = readFreshnessRevision({
    mqttStatus: options.mqttStatus,
    now,
    pages,
    settings,
    siteScope: options.siteScope
  });
  const effectiveRotationRevision = createEffectiveRotationCacheKey({
    freshnessRevision,
    profileId: options.profileId,
    profileRevision,
    profileVersionId: options.profileVersionId,
    readinessRevision,
    siteScope: options.siteScope
  });

  return effectiveRotationCache.getOrEvaluate(
    effectiveRotationRevision,
    () => ({
      effectiveRotationRevision,
      preview: evaluateResolvedDisplayRotation({
        mqttStatus: options.mqttStatus,
        now,
        pages,
        readinessReport,
        settings,
        siteScope: options.siteScope
      }),
      settings
    })
  );
}

export function readEffectiveDisplayRotationSnapshot(options: {
  mqttStatus: MqttStatusLike;
  now?: Date;
  profileId: number;
  siteScope: SiteScope;
}): EffectiveDisplayRotationSnapshot {
  return readCachedRotationSnapshot({
    mqttStatus: options.mqttStatus,
    now: options.now ?? new Date(),
    pages: resolveRotationPages(options.profileId),
    profileId: options.profileId,
    settings: readPlaybackSettings(options.profileId),
    siteScope: options.siteScope
  });
}

export function readEffectiveProfileVersionRotationSnapshot(options: {
  mqttStatus: MqttStatusLike;
  now?: Date;
  pages: PlaybackPage[];
  profileId: number;
  profileVersionId: number;
  settings: PlaybackSettings;
  siteScope: SiteScope;
}): EffectiveDisplayRotationSnapshot {
  return readCachedRotationSnapshot({
    mqttStatus: options.mqttStatus,
    now: options.now ?? new Date(),
    pages: options.pages,
    profileId: options.profileId,
    profileVersionId: options.profileVersionId,
    settings: options.settings,
    siteScope: options.siteScope
  });
}
