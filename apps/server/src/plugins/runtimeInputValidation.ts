import type { FastifyInstance, FastifyRequest } from "fastify";
import { getDatabase } from "../db/index.js";
import {
  readPlaybackPages,
  readPlaybackSettings,
  type PlaybackPageUpdateInput
} from "../services/displayRotationService.js";
import type { MqttSettingsRow } from "../mqtt/settings-source.js";
import {
  isFiniteNumber,
  isRecord,
  sendBadRequest,
  sendNotFound,
  type RecordLike
} from "./inputValidationSupport.js";

const CLOCK_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const PLAYLIST_FALLBACK_MODES = new Set(["display-placeholder", "skip", "use-cover"]);

type PlaylistEntryRef = {
  asset_id: number | null;
  entry_id: string;
};

type PlaylistAssetRef = {
  display_order: number | null;
  id: number;
  included_in_slideshow: number;
  original_name: string | null;
};

function hasOwn(body: RecordLike, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return isSafeInteger(value) && value >= 0;
}

function replaceRequestBody(request: FastifyRequest, body: RecordLike) {
  request.body = body;
}

function validatePlaybackSettingsBody(body: unknown): string | null {
  if (!isRecord(body)) {
    return "Playback settings body must be an object";
  }

  for (const key of ["autoplay", "loop", "enforceFreshRuntimeData", "scheduleEnabled"] as const) {
    if (hasOwn(body, key) && typeof body[key] !== "boolean") {
      return `${key} must be a boolean`;
    }
  }

  if (
    hasOwn(body, "brightness")
    && (!isFiniteNumber(body.brightness) || body.brightness < 0 || body.brightness > 100)
  ) {
    return "brightness must be a finite number from 0 through 100";
  }

  if (
    hasOwn(body, "idleMode")
    && body.idleMode !== "disabled"
    && body.idleMode !== "return-to-start"
  ) {
    return "idleMode is not supported";
  }

  if (hasOwn(body, "idleTimeout") && !isPositiveSafeInteger(body.idleTimeout)) {
    return "idleTimeout must be a positive safe integer";
  }

  if (
    hasOwn(body, "orientation")
    && body.orientation !== "landscape"
    && body.orientation !== "portrait"
  ) {
    return "orientation is not supported";
  }

  if (hasOwn(body, "repeatDays")) {
    if (!Array.isArray(body.repeatDays)) {
      return "repeatDays must be an array";
    }
    const days = body.repeatDays;
    if (days.some((day) => !isSafeInteger(day) || day < 0 || day > 6)) {
      return "repeatDays must contain only integers from 0 through 6";
    }
    if (new Set(days).size !== days.length) {
      return "repeatDays must not contain duplicates";
    }
  }

  for (const key of ["scheduleStart", "scheduleEnd"] as const) {
    if (!hasOwn(body, key)) {
      continue;
    }
    const value = body[key];
    if (value !== null && (typeof value !== "string" || !CLOCK_PATTERN.test(value))) {
      return `${key} must be null or a complete HH:mm clock value`;
    }
  }

  if (hasOwn(body, "startPage")) {
    if (!isPositiveSafeInteger(body.startPage)) {
      return "startPage must be a positive safe integer";
    }
    if (!readPlaybackPages().some((page) => page.id === body.startPage)) {
      return "startPage does not reference a playback page";
    }
  }

  if (
    hasOwn(body, "transitionType")
    && body.transitionType !== "fade"
    && body.transitionType !== "slide"
    && body.transitionType !== "none"
  ) {
    return "transitionType is not supported";
  }

  if (hasOwn(body, "transitionSpeed") && !isFiniteNumber(body.transitionSpeed)) {
    return "transitionSpeed must be a finite number";
  }

  const current = readPlaybackSettings();
  const scheduleEnabled = hasOwn(body, "scheduleEnabled")
    ? body.scheduleEnabled
    : current.scheduleEnabled;
  const scheduleStart = hasOwn(body, "scheduleStart")
    ? body.scheduleStart
    : current.scheduleStart;
  const scheduleEnd = hasOwn(body, "scheduleEnd")
    ? body.scheduleEnd
    : current.scheduleEnd;

  if (
    scheduleEnabled === true
    && (
      typeof scheduleStart !== "string"
      || !CLOCK_PATTERN.test(scheduleStart)
      || typeof scheduleEnd !== "string"
      || !CLOCK_PATTERN.test(scheduleEnd)
    )
  ) {
    return "Enabled playback schedule requires valid scheduleStart and scheduleEnd";
  }

  return null;
}

function validateAndHydratePlaybackPages(body: unknown):
  | { error: string; pages?: never }
  | { error?: never; pages: PlaybackPageUpdateInput[] } {
  if (!isRecord(body) || !Array.isArray(body.pages)) {
    return { error: "pages must be an array" };
  }

  const existingById = new Map(readPlaybackPages().map((page) => [page.id, page]));
  const seen = new Set<number>();
  const pages: PlaybackPageUpdateInput[] = [];

  for (const [index, raw] of body.pages.entries()) {
    if (!isRecord(raw)) {
      return { error: `pages[${index}] must be an object` };
    }
    if (!isPositiveSafeInteger(raw.id)) {
      return { error: `pages[${index}].id must be a positive safe integer` };
    }
    if (seen.has(raw.id)) {
      return { error: `pages contains duplicate id ${raw.id}` };
    }
    seen.add(raw.id);

    const existing = existingById.get(raw.id);
    if (!existing) {
      return { error: `Playback page ${raw.id} was not found` };
    }

    if (hasOwn(raw, "displayOrder") && !isNonNegativeSafeInteger(raw.displayOrder)) {
      return { error: `pages[${index}].displayOrder must be a non-negative safe integer` };
    }
    if (hasOwn(raw, "durationSeconds") && !isPositiveSafeInteger(raw.durationSeconds)) {
      return { error: `pages[${index}].durationSeconds must be a positive safe integer` };
    }
    if (hasOwn(raw, "enabled") && typeof raw.enabled !== "boolean") {
      return { error: `pages[${index}].enabled must be a boolean` };
    }

    pages.push({
      displayOrder: hasOwn(raw, "displayOrder") ? raw.displayOrder as number : existing.displayOrder,
      durationSeconds: hasOwn(raw, "durationSeconds") ? raw.durationSeconds as number : existing.durationSeconds,
      enabled: hasOwn(raw, "enabled") ? raw.enabled as boolean : existing.enabled,
      id: raw.id
    });
  }

  return { pages };
}

function readMqttSettingsRow(): MqttSettingsRow | undefined {
  return getDatabase()
    .prepare(`
      SELECT broker_host, broker_port, username, password, client_id, reconnect_interval, message_timeout, data_mode
      FROM mqtt_settings
      LIMIT 1
    `)
    .get() as MqttSettingsRow | undefined;
}

function validateAndHydrateMqttSettings(body: unknown):
  | { error: string; body?: never }
  | { error?: never; body: RecordLike } {
  const raw = body === undefined ? {} : body;
  if (!isRecord(raw)) {
    return { error: "MQTT settings body must be an object" };
  }

  if (hasOwn(raw, "dataMode") && raw.dataMode !== "mqtt" && raw.dataMode !== "mock") {
    return { error: "dataMode must be mqtt or mock" };
  }
  for (const key of ["host", "clientId"] as const) {
    if (hasOwn(raw, key) && (typeof raw[key] !== "string" || raw[key].trim().length === 0)) {
      return { error: `${key} must be a non-empty string` };
    }
  }
  for (const key of ["username", "password"] as const) {
    if (hasOwn(raw, key) && typeof raw[key] !== "string") {
      return { error: `${key} must be a string` };
    }
  }
  if (
    hasOwn(raw, "port")
    && (!isSafeInteger(raw.port) || raw.port < 1 || raw.port > 65_535)
  ) {
    return { error: "port must be an integer from 1 through 65535" };
  }
  if (hasOwn(raw, "messageTimeout") && !isPositiveSafeInteger(raw.messageTimeout)) {
    return { error: "messageTimeout must be a positive safe integer" };
  }
  if (hasOwn(raw, "reconnectInterval") && !isNonNegativeSafeInteger(raw.reconnectInterval)) {
    return { error: "reconnectInterval must be a non-negative safe integer" };
  }

  const current = readMqttSettingsRow();
  const currentMode = current?.data_mode === "mock" ? "mock" : "mqtt";
  const hydrated: RecordLike = {
    ...raw,
    clientId: hasOwn(raw, "clientId")
      ? raw.clientId
      : current?.client_id?.trim() || "solar-display-player",
    dataMode: hasOwn(raw, "dataMode") ? raw.dataMode : currentMode,
    host: hasOwn(raw, "host") ? raw.host : current?.broker_host?.trim() || "localhost",
    messageTimeout: hasOwn(raw, "messageTimeout")
      ? raw.messageTimeout
      : current?.message_timeout ?? 30,
    port: hasOwn(raw, "port") ? raw.port : current?.broker_port ?? 1883,
    reconnectInterval: hasOwn(raw, "reconnectInterval")
      ? raw.reconnectInterval
      : current?.reconnect_interval ?? 5000,
    username: hasOwn(raw, "username") ? raw.username : current?.username ?? ""
  };

  return { body: hydrated };
}

function playlistTableExists(): boolean {
  return Boolean(
    getDatabase()
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'image_playlist_entries'")
      .get()
  );
}

function formatEntryId(index: number) {
  return `IMG-${String(index).padStart(2, "0")}`;
}

function readAvailablePlaylistEntryIds(): Set<string> {
  const database = getDatabase();
  const persisted = playlistTableExists()
    ? database
        .prepare("SELECT entry_id, asset_id FROM image_playlist_entries ORDER BY entry_id ASC")
        .all() as PlaylistEntryRef[]
    : [];
  const ids = new Set(persisted.map((row) => row.entry_id));
  const representedAssetIds = new Set(
    persisted.flatMap((row) => row.asset_id === null ? [] : [row.asset_id])
  );
  const indexedPersisted = persisted.filter(
    (row): row is PlaylistEntryRef & { asset_id: number } => row.asset_id !== null
  );
  let nextIndex = indexedPersisted.reduce((max, row) => {
    const match = /^IMG-(\d+)$/u.exec(row.entry_id);
    return match?.[1] ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

  const assets = database
    .prepare(`
      SELECT id, original_name, included_in_slideshow, display_order
      FROM image_assets
      ORDER BY display_order ASC, id ASC
    `)
    .all() as PlaylistAssetRef[];

  for (const asset of assets) {
    const eligible = asset.included_in_slideshow === 1 || !asset.original_name?.startsWith("display-seed:");
    if (!eligible || representedAssetIds.has(asset.id)) {
      continue;
    }
    ids.add(formatEntryId(nextIndex));
    nextIndex += 1;
  }

  return ids;
}

function imageAssetExists(assetId: number): boolean {
  return Boolean(getDatabase().prepare("SELECT 1 FROM image_assets WHERE id = ?").get(assetId));
}

function validatePlaylistEntryBody(body: unknown): string | null {
  if (!isRecord(body)) {
    return "Image playlist entry body must be an object";
  }

  for (const key of ["area", "capturedAt", "description", "title"] as const) {
    if (hasOwn(body, key) && body[key] !== null && typeof body[key] !== "string") {
      return `${key} must be a string or null`;
    }
  }
  if (hasOwn(body, "assetId")) {
    const assetId = body.assetId;
    if (assetId !== null && !isPositiveSafeInteger(assetId)) {
      return "assetId must be null or a positive safe integer";
    }
    if (typeof assetId === "number" && !imageAssetExists(assetId)) {
      return "assetId does not reference an image asset";
    }
  }
  if (hasOwn(body, "displayOrder") && !isNonNegativeSafeInteger(body.displayOrder)) {
    return "displayOrder must be a non-negative safe integer";
  }
  if (hasOwn(body, "durationSeconds") && !isPositiveSafeInteger(body.durationSeconds)) {
    return "durationSeconds must be a positive safe integer";
  }
  if (hasOwn(body, "enabled") && typeof body.enabled !== "boolean") {
    return "enabled must be a boolean";
  }
  if (
    hasOwn(body, "fallbackMode")
    && (typeof body.fallbackMode !== "string" || !PLAYLIST_FALLBACK_MODES.has(body.fallbackMode))
  ) {
    return "fallbackMode is not supported";
  }
  if (
    hasOwn(body, "tags")
    && (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string"))
  ) {
    return "tags must be an array of strings";
  }
  return null;
}

function validatePlaylistReorderBody(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.entries)) {
    return "entries must be an array";
  }

  const available = readAvailablePlaylistEntryIds();
  const seen = new Set<string>();
  for (const [index, raw] of body.entries.entries()) {
    if (!isRecord(raw)) {
      return `entries[${index}] must be an object`;
    }
    if (typeof raw.entryId !== "string" || raw.entryId.trim().length === 0) {
      return `entries[${index}].entryId must be a non-empty string`;
    }
    if (seen.has(raw.entryId)) {
      return `entries contains duplicate entryId ${raw.entryId}`;
    }
    seen.add(raw.entryId);
    if (!available.has(raw.entryId)) {
      return `Unknown image playlist entry: ${raw.entryId}`;
    }
    if (!isNonNegativeSafeInteger(raw.displayOrder)) {
      return `entries[${index}].displayOrder must be a non-negative safe integer`;
    }
    if (hasOwn(raw, "durationSeconds") && !isPositiveSafeInteger(raw.durationSeconds)) {
      return `entries[${index}].durationSeconds must be a positive safe integer`;
    }
    if (hasOwn(raw, "enabled") && typeof raw.enabled !== "boolean") {
      return `entries[${index}].enabled must be a boolean`;
    }
  }
  return null;
}

export async function runtimeInputValidationPlugin(app: FastifyInstance) {
  app.addHook("preValidation", async (request, reply) => {
    const method = request.method.toUpperCase();
    const routeUrl = request.routeOptions.url;

    if (method === "PUT" && routeUrl === "/api/playback/settings") {
      const error = validatePlaybackSettingsBody(request.body);
      if (error) return sendBadRequest(reply, error);
      return;
    }

    if (
      method === "PUT"
      && (routeUrl === "/api/playback/pages" || routeUrl === "/api/playback/rotation-plan")
    ) {
      const validation = validateAndHydratePlaybackPages(request.body);
      if (validation.error !== undefined) {
        if (/was not found$/u.test(validation.error)) {
          return sendNotFound(reply, validation.error);
        }
        return sendBadRequest(reply, validation.error);
      }
      replaceRequestBody(request, {
        ...(request.body as RecordLike),
        pages: validation.pages
      });
      return;
    }

    if (
      (method === "PUT" && routeUrl === "/api/settings/mqtt")
      || (method === "POST" && routeUrl === "/api/settings/mqtt/test")
    ) {
      const validation = validateAndHydrateMqttSettings(request.body);
      if (validation.error !== undefined) return sendBadRequest(reply, validation.error);
      replaceRequestBody(request, validation.body);
      return;
    }

    if (method !== "PUT") {
      return;
    }

    if (routeUrl === "/api/image-playlist/settings") {
      if (!isRecord(request.body)) return sendBadRequest(reply, "Image playlist settings body must be an object");
      if (hasOwn(request.body, "shuffle") && typeof request.body.shuffle !== "boolean") {
        return sendBadRequest(reply, "shuffle must be a boolean");
      }
      return;
    }

    if (routeUrl === "/api/image-playlist/duration-all") {
      if (!isRecord(request.body) || !isPositiveSafeInteger(request.body.durationSeconds)) {
        return sendBadRequest(reply, "durationSeconds must be a positive safe integer");
      }
      return;
    }

    if (routeUrl === "/api/image-playlist/reorder") {
      const error = validatePlaylistReorderBody(request.body);
      if (error) return sendBadRequest(reply, error);
      return;
    }

    if (routeUrl !== "/api/image-playlist/:entryId") {
      return;
    }

    const params = isRecord(request.params) ? request.params : {};
    const entryId = typeof params.entryId === "string" ? params.entryId : "";
    if (!readAvailablePlaylistEntryIds().has(entryId)) {
      return sendNotFound(reply, "Image playlist entry not found");
    }
    const error = validatePlaylistEntryBody(request.body ?? {});
    if (error) return sendBadRequest(reply, error);
  });
}
