import type { FastifyPluginAsync } from "fastify";
import type { PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

// ---------- internal row types ----------

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
  display_order: number;
  duration_seconds: number;
  enabled: number;
  id: number;
  label_en: string;
  label_zh: string;
  page_key: string;
  route: string;
};

// ---------- helpers ----------

function toBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function parseRepeatDays(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((token) => Number.parseInt(token.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

function serializeRepeatDays(days: number[]): string {
  return days.filter((d) => d >= 0 && d <= 6).join(",");
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
    route: row.route
  };
}

function getSettingsRow(): PlaybackSettingsRow {
  const database = getDatabase();
  const row = database
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

function getPages(): PlaybackPageRow[] {
  const database = getDatabase();
  return database
    .prepare(
      `
        SELECT
          id,
          page_key,
          route,
          label_zh,
          label_en,
          enabled,
          display_order,
          duration_seconds
        FROM playback_pages
        ORDER BY display_order ASC, id ASC
      `
    )
    .all() as PlaybackPageRow[];
}

type PlaybackSettingsUpdateBody = Partial<PlaybackSettings>;

type PlaybackPageUpdateInput = {
  id: number;
  enabled?: boolean;
  displayOrder?: number;
  durationSeconds?: number;
};

type PlaybackPagesUpdateBody = {
  pages: PlaybackPageUpdateInput[];
};

const playbackRoute: FastifyPluginAsync = async (app) => {
  // ---------- GET /api/playback/settings ----------
  app.get("/api/playback/settings", async () => ({
    settings: serializeSettingsRow(getSettingsRow())
  }));

  // ---------- PUT /api/playback/settings ----------
  app.put<{ Body: PlaybackSettingsUpdateBody }>(
    "/api/playback/settings",
    async (request, reply) => {
      const database = getDatabase();
      const current = getSettingsRow();
      const body = request.body ?? {};

      const nextAutoplay = body.autoplay ?? toBoolean(current.autoplay);
      const nextLoop = body.loop ?? toBoolean(current.loop);
      const nextStartPage =
        typeof body.startPage === "number" ? body.startPage : current.start_page;
      const nextTransitionType =
        body.transitionType === "slide" || body.transitionType === "none"
          ? body.transitionType
          : current.transition_type;
      const nextTransitionSpeed =
        typeof body.transitionSpeed === "number"
          ? Math.max(0, body.transitionSpeed)
          : current.transition_speed;
      const nextScheduleEnabled = body.scheduleEnabled ?? toBoolean(current.schedule_enabled);
      const nextScheduleStart =
        body.scheduleStart === undefined ? current.schedule_start : body.scheduleStart;
      const nextScheduleEnd =
        body.scheduleEnd === undefined ? current.schedule_end : body.scheduleEnd;
      const nextRepeatDays = body.repeatDays ?? parseRepeatDays(current.repeat_days);
      const nextIdleMode =
        body.idleMode === "return-to-start" ? "return-to-start" : "disabled";
      const nextIdleTimeout =
        typeof body.idleTimeout === "number"
          ? Math.max(1, body.idleTimeout)
          : current.idle_timeout;
      const nextBrightness =
        typeof body.brightness === "number"
          ? Math.min(100, Math.max(0, body.brightness))
          : current.brightness;
      const nextOrientation =
        body.orientation === "portrait" ? "portrait" : "landscape";

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
          nextAutoplay ? 1 : 0,
          nextLoop ? 1 : 0,
          nextStartPage,
          nextTransitionType,
          nextTransitionSpeed,
          nextScheduleEnabled ? 1 : 0,
          nextScheduleStart,
          nextScheduleEnd,
          serializeRepeatDays(nextRepeatDays),
          nextIdleMode,
          nextIdleTimeout,
          nextBrightness,
          nextOrientation
        );

      const updatedSettings = serializeSettingsRow(getSettingsRow());

      app.socketService.emitPlaybackSettingsUpdated({ settings: updatedSettings });

      return { settings: updatedSettings };
    }
  );

  // ---------- GET /api/playback/pages ----------
  app.get("/api/playback/pages", async () => ({
    pages: getPages().map(serializePageRow)
  }));

  // ---------- PUT /api/playback/pages ----------
  app.put<{ Body: PlaybackPagesUpdateBody }>(
    "/api/playback/pages",
    async (request, reply) => {
      const database = getDatabase();
      const body = request.body ?? { pages: [] };

      const updatePage = database.prepare(
        `
          UPDATE playback_pages
          SET
            display_order = ?,
            duration_seconds = ?,
            enabled = ?
          WHERE id = ?
        `
      );

      const transaction = database.transaction((pages: PlaybackPageUpdateInput[]) => {
        for (const page of pages) {
          updatePage.run(
            typeof page.displayOrder === "number" ? page.displayOrder : 0,
            typeof page.durationSeconds === "number"
              ? Math.max(1, page.durationSeconds)
              : 15,
            page.enabled === false ? 0 : 1,
            page.id
          );
        }
      });

      transaction(body.pages);

      const updatedPages = getPages().map(serializePageRow);

      app.socketService.emitPlaybackSettingsUpdated({ pages: updatedPages });

      return { pages: updatedPages };
    }
  );
};

export default playbackRoute;
