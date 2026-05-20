import type {
  DisplayReadinessFinding,
  DisplayPageTemplateKey,
  DisplayRotationPageCondition,
  DisplayRotationPlan,
  DisplayRotationPreview,
  FallbackPolicy,
  PlaybackPage,
  PlaybackSettings
} from "@solar-display/shared";
import {
  buildDisplayRotationPlan,
  evaluateDisplayRotation,
  resolveDisplayPageFallbackPolicyByPageId
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { collectDisplayPageAssetFindings } from "./displayPageAssetService.js";
import { readDisplayReadinessReport } from "./displayReadinessService.js";

type PlaybackSettingsRow = {
  autoplay: number;
  brightness: number;
  idle_mode: string;
  idle_timeout: number;
  loop: number;
  orientation: string;
  repeat_days: string;
  schedule_enabled: number;
  schedule_end: string | null;
  schedule_start: string | null;
  start_page: number;
  transition_speed: number;
  transition_type: string;
  updated_at: string | null;
};

type PlaybackPageRow = {
  archived_at: string | null;
  display_order: number;
  duration_seconds: number;
  enabled: number;
  id: number;
  label_en: string;
  label_zh: string;
  page_key: string;
  route_slug: string;
  template_key: DisplayPageTemplateKey;
};

type MqttSettingsRow = {
  message_timeout: number | null;
};

type StageConfigRow = {
  config_json: string;
  page_key: string;
  published_at: string | null;
};

type MqttStatusLike = {
  connected: boolean;
  reason: string | null;
};

const liveDataPageKeys = new Set<DisplayPageTemplateKey>([
  "overview",
  "solar",
  "factory-circuit",
  "sustainability"
]);

function buildReadinessFindingsByTemplateKey() {
  const byTemplateKey = new Map<DisplayPageTemplateKey, DisplayReadinessFinding[]>();

  for (const finding of readDisplayReadinessReport().findings) {
    if (!finding.blocking || !liveDataPageKeys.has(finding.pageId)) {
      continue;
    }

    const findings = byTemplateKey.get(finding.pageId) ?? [];
    findings.push(finding);
    byTemplateKey.set(finding.pageId, findings);
  }

  return byTemplateKey;
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
  fallbackPolicy: FallbackPolicy;
  liveMetricsTimestamp: string | null;
  metricsFresh: boolean;
  mqttStatus: MqttStatusLike;
  pageRequiresLiveData: boolean;
}) {
  if (!args.pageRequiresLiveData) {
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

  if (args.metricsFresh) {
    return null;
  }

  return args.fallbackPolicy.staleData === "hide"
    ? {
        detail: args.liveMetricsTimestamp
          ? `最後資料時間 ${args.liveMetricsTimestamp} 已超過 freshness window`
          : "尚未收到可用的即時資料",
        skipReason: "stale-runtime"
      }
    : null;
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

function serializeSettingsRow(row: PlaybackSettingsRow): PlaybackSettings {
  return {
    autoplay: toBoolean(row.autoplay),
    brightness: row.brightness,
    idleMode: row.idle_mode === "return-to-start" ? "return-to-start" : "disabled",
    idleTimeout: row.idle_timeout,
    loop: toBoolean(row.loop),
    orientation: row.orientation === "portrait" ? "portrait" : "landscape",
    repeatDays: parseRepeatDays(row.repeat_days),
    scheduleEnabled: toBoolean(row.schedule_enabled),
    scheduleEnd: row.schedule_end,
    scheduleStart: row.schedule_start,
    startPage: row.start_page,
    transitionSpeed: row.transition_speed,
    transitionType: row.transition_type as PlaybackSettings["transitionType"],
    updatedAt: row.updated_at
  };
}

function serializePageRow(row: PlaybackPageRow): PlaybackPage {
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

function readPlaybackSettingsRow(): PlaybackSettingsRow {
  const row = getDatabase()
    .prepare(
      `
        SELECT
          autoplay,
          brightness,
          idle_mode,
          idle_timeout,
          loop,
          orientation,
          repeat_days,
          schedule_enabled,
          schedule_end,
          schedule_start,
          start_page,
          transition_speed,
          transition_type,
          updated_at
        FROM playback_settings
        LIMIT 1
      `
    )
    .get() as PlaybackSettingsRow | undefined;

  return (
    row ?? {
      autoplay: 1,
      brightness: 100,
      idle_mode: "disabled",
      idle_timeout: 300,
      loop: 1,
      orientation: "landscape",
      repeat_days: "",
      schedule_enabled: 0,
      schedule_end: null,
      schedule_start: null,
      start_page: 0,
      transition_speed: 1000,
      transition_type: "fade",
      updated_at: null
    }
  );
}

export function readPlaybackSettings() {
  return serializeSettingsRow(readPlaybackSettingsRow());
}

export function updatePlaybackSettings(body: Partial<PlaybackSettings>) {
  const database = getDatabase();
  const current = readPlaybackSettingsRow();
  const nextSettings = {
    autoplay: body.autoplay ?? toBoolean(current.autoplay),
    brightness:
      typeof body.brightness === "number" ? Math.min(100, Math.max(0, body.brightness)) : current.brightness,
    idleMode:
      body.idleMode === "return-to-start" ? "return-to-start" : body.idleMode === undefined ? current.idle_mode : "disabled",
    idleTimeout:
      typeof body.idleTimeout === "number" ? Math.max(1, body.idleTimeout) : current.idle_timeout,
    loop: body.loop ?? toBoolean(current.loop),
    orientation:
      body.orientation === "portrait" ? "portrait" : body.orientation === undefined ? current.orientation : "landscape",
    repeatDays: body.repeatDays ?? parseRepeatDays(current.repeat_days),
    scheduleEnabled: body.scheduleEnabled ?? toBoolean(current.schedule_enabled),
    scheduleEnd: body.scheduleEnd === undefined ? current.schedule_end : body.scheduleEnd,
    scheduleStart: body.scheduleStart === undefined ? current.schedule_start : body.scheduleStart,
    startPage: typeof body.startPage === "number" ? body.startPage : current.start_page,
    transitionSpeed:
      typeof body.transitionSpeed === "number" ? Math.max(0, body.transitionSpeed) : current.transition_speed,
    transitionType:
      body.transitionType === "slide" || body.transitionType === "none"
        ? body.transitionType
        : current.transition_type
  };

  database
    .prepare(
      `
        UPDATE playback_settings SET
          autoplay = ?,
          loop = ?,
          start_page = ?,
          transition_type = ?,
          transition_speed = ?,
          schedule_enabled = ?,
          schedule_start = ?,
          schedule_end = ?,
          repeat_days = ?,
          idle_mode = ?,
          idle_timeout = ?,
          brightness = ?,
          orientation = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM playback_settings LIMIT 1)
      `
    )
    .run(
      nextSettings.autoplay ? 1 : 0,
      nextSettings.loop ? 1 : 0,
      nextSettings.startPage,
      nextSettings.transitionType,
      nextSettings.transitionSpeed,
      nextSettings.scheduleEnabled ? 1 : 0,
      nextSettings.scheduleStart,
      nextSettings.scheduleEnd,
      serializeRepeatDays(nextSettings.repeatDays),
      nextSettings.idleMode,
      nextSettings.idleTimeout,
      nextSettings.brightness,
      nextSettings.orientation
    );

  return readPlaybackSettings();
}

export function readPlaybackPages() {
  return (
    getDatabase()
      .prepare(
        `
          SELECT
            id,
            page_key,
            template_key,
            route_slug,
            label_zh,
            label_en,
            enabled,
            archived_at,
            display_order,
            duration_seconds
          FROM display_page_registry
          WHERE archived_at IS NULL
          ORDER BY display_order ASC, id ASC
        `
      )
      .all() as PlaybackPageRow[]
  ).map(serializePageRow);
}

function readMessageTimeoutSeconds() {
  const row = getDatabase()
    .prepare(
      `
        SELECT message_timeout
        FROM mqtt_settings
        LIMIT 1
      `
    )
    .get() as MqttSettingsRow | undefined;

  return Math.max(1, row?.message_timeout ?? 30);
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
  now: Date
) {
  const liveStageByPage = new Map(
    readLiveStageRows().map((row) => [row.page_key, row] satisfies [string, StageConfigRow])
  );
  const liveMetrics = readLiveMetricsSnapshot();
  const readinessFindingsByTemplateKey = buildReadinessFindingsByTemplateKey();
  const freshMetricsDeadlineMs = readMessageTimeoutSeconds() * 1000;
  const metricsFresh =
    liveMetrics.timestamp !== null &&
    now.getTime() - new Date(liveMetrics.timestamp).getTime() <= freshMetricsDeadlineMs;
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
    const pageRequiresLiveData =
      page.templateKey !== undefined && liveDataPageKeys.has(page.templateKey);
    const readinessCondition =
      page.templateKey === undefined
        ? null
        : resolveReadinessSkipReason(
            readinessFindingsByTemplateKey.get(page.templateKey) ?? []
          );
    const runtimeDataCondition = resolveRuntimeDataCondition({
      fallbackPolicy,
      liveMetricsTimestamp: liveMetrics.timestamp,
      metricsFresh,
      mqttStatus,
      pageRequiresLiveData
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
        metricsFresh ||
        mqttStatus.reason === "mock" ||
        fallbackPolicy.staleData !== "hide");

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
  const updatePage = database.prepare(
    `
      UPDATE display_page_registry
      SET
        display_order = ?,
        duration_seconds = ?,
        enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  );

  database.transaction((inputs: PlaybackPageUpdateInput[]) => {
    for (const page of inputs) {
      updatePage.run(
        typeof page.displayOrder === "number" ? page.displayOrder : 0,
        typeof page.durationSeconds === "number" ? Math.max(1, page.durationSeconds) : 15,
        page.enabled === false ? 0 : 1,
        page.id
      );
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

export function readDisplayRotationPreview(options: {
  mqttStatus: MqttStatusLike;
  now?: Date;
}): DisplayRotationPreview {
  const now = options.now ?? new Date();
  const settings = readPlaybackSettings();
  const pages = readPlaybackPages();

  return evaluateDisplayRotation({
    fallbackRoute: "/offline",
    now,
    pageConditions: buildPageConditions(pages, options.mqttStatus, now),
    pages,
    settings
  });
}
