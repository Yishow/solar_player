import type { DisplayRotationPlan, PlaybackPage, PlaybackSettings } from "@solar-display/shared";
import { buildDisplayRotationPlan } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

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
    route: row.route
  };
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
      .all() as PlaybackPageRow[]
  ).map(serializePageRow);
}

export function updatePlaybackPages(pages: PlaybackPageUpdateInput[]) {
  const database = getDatabase();
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
