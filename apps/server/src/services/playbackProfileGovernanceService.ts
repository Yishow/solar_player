import { randomUUID } from "node:crypto";
import type {
  PlaybackPage,
  PlaybackProfileDraft,
  PlaybackProfilePreview,
  PlaybackProfileSitePreview,
  PlaybackProfileSnapshot,
  PlaybackProfileSummary,
  PlaybackProfileVersion,
  PlaybackSettings
} from "@solar-display/shared";
import {
  PLAYBACK_TRANSITION_SPEED_MAX_MS,
  PLAYBACK_TRANSITION_SPEED_MIN_MS
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import {
  evaluatePlaybackSnapshot,
  readPlaybackPages,
  readPlaybackSettings
} from "./displayRotationService.js";
import { readDefaultPlaybackProfileId } from "./playbackProfileService.js";
import { assignDesiredProfileVersion } from "./deviceProfileRolloutService.js";

type DraftRow = {
  pages_json: string;
  profile_id: number;
  revision: number;
  settings_json: string;
  updated_at: string;
};

type VersionRow = {
  created_at: string;
  created_by: string;
  id: number;
  profile_id: number;
  rollback_from_version_id: number | null;
  schema_version: number;
  snapshot_json: string;
  version_number: number;
};

export class PlaybackProfileGovernanceError extends Error {
  readonly code: string;
  readonly currentRevision?: number;
  readonly statusCode: number;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    currentRevision?: number
  ) {
    super(message);
    this.name = "PlaybackProfileGovernanceError";
    this.code = code;
    this.statusCode = statusCode;
    this.currentRevision = currentRevision;
  }
}

function requireProfile(profileId: number) {
  const profile = getDatabase()
    .prepare(
      `SELECT id, profile_key, name, is_default, archived_at
       FROM playback_profiles WHERE id = ?`
    )
    .get(profileId) as {
      archived_at: string | null;
      id: number;
      is_default: number;
      name: string;
      profile_key: string;
    } | undefined;
  if (!profile) {
    throw new PlaybackProfileGovernanceError(
      "profile_not_found",
      "Playback Profile was not found",
      404
    );
  }
  return profile;
}

function serializeProfile(profile: ReturnType<typeof requireProfile>): PlaybackProfileSummary {
  return {
    archivedAt: profile.archived_at,
    id: profile.id,
    isDefault: profile.is_default === 1,
    name: profile.name,
    profileKey: profile.profile_key
  };
}

function snapshotFromCurrent(profileId: number): PlaybackProfileSnapshot {
  return {
    pages: readPlaybackPages(profileId),
    settings: readPlaybackSettings(profileId)
  };
}

function ensureDraft(profileId: number) {
  requireProfile(profileId);
  const existing = getDatabase()
    .prepare("SELECT profile_id FROM playback_profile_drafts WHERE profile_id = ?")
    .get(profileId);
  if (existing) {
    return;
  }
  const snapshot = snapshotFromCurrent(profileId);
  getDatabase()
    .prepare(
      `INSERT INTO playback_profile_drafts (
         profile_id, revision, settings_json, pages_json, updated_at
       ) VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)`
    )
    .run(profileId, JSON.stringify(snapshot.settings), JSON.stringify(snapshot.pages));
}

function serializeDraft(row: DraftRow): PlaybackProfileDraft {
  return {
    pages: JSON.parse(row.pages_json) as PlaybackPage[],
    profileId: row.profile_id,
    revision: row.revision,
    settings: JSON.parse(row.settings_json) as PlaybackSettings,
    updatedAt: row.updated_at
  };
}

function invalidDraft(message: string): never {
  throw new PlaybackProfileGovernanceError(
    "profile_draft_invalid",
    message,
    400
  );
}

function validateDraftSettings(
  value: PlaybackSettings,
  trustedUpdatedAt: string
): PlaybackSettings {
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
  if (
    typeof value !== "object"
    || value === null
    || typeof value.autoplay !== "boolean"
    || typeof value.loop !== "boolean"
    || !Number.isInteger(value.startPage)
    || !["fade", "slide", "none"].includes(value.transitionType)
    || !Number.isFinite(value.transitionSpeed)
    || (
      value.transitionSpeed !== 0
      && (
        value.transitionSpeed < PLAYBACK_TRANSITION_SPEED_MIN_MS
        || value.transitionSpeed > PLAYBACK_TRANSITION_SPEED_MAX_MS
      )
    )
    || (value.transitionType !== "none" && value.transitionSpeed === 0)
    || typeof value.enforceFreshRuntimeData !== "boolean"
    || typeof value.scheduleEnabled !== "boolean"
    || !(
      value.scheduleStart === null
      || (
        typeof value.scheduleStart === "string"
        && clockPattern.test(value.scheduleStart)
      )
    )
    || !(
      value.scheduleEnd === null
      || (
        typeof value.scheduleEnd === "string"
        && clockPattern.test(value.scheduleEnd)
      )
    )
    || !Array.isArray(value.repeatDays)
    || value.repeatDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    || new Set(value.repeatDays).size !== value.repeatDays.length
    || !["disabled", "return-to-start"].includes(value.idleMode)
    || !Number.isInteger(value.idleTimeout)
    || value.idleTimeout < 1
    || !Number.isFinite(value.brightness)
    || value.brightness < 0
    || value.brightness > 100
    || !["landscape", "portrait"].includes(value.orientation)
  ) {
    invalidDraft("Playback Profile Draft settings are invalid");
  }
  return {
    autoplay: value.autoplay,
    brightness: value.brightness,
    enforceFreshRuntimeData: value.enforceFreshRuntimeData,
    idleMode: value.idleMode,
    idleTimeout: value.idleTimeout,
    loop: value.loop,
    orientation: value.orientation,
    repeatDays: [...value.repeatDays].sort((left, right) => left - right),
    scheduleEnabled: value.scheduleEnabled,
    scheduleEnd: value.scheduleEnd,
    scheduleStart: value.scheduleStart,
    startPage: value.startPage,
    transitionSpeed: value.transitionSpeed,
    transitionType: value.transitionType,
    updatedAt: trustedUpdatedAt
  };
}

function validateDraftPages(profileId: number, pages: PlaybackPage[]): PlaybackPage[] {
  const canonical = readPlaybackPages(profileId);
  if (pages.length !== canonical.length) {
    invalidDraft("Playback Profile Draft must contain every canonical page once");
  }
  const canonicalById = new Map(canonical.map((page) => [page.id, page]));
  const seenIds = new Set<number>();
  const seenOrders = new Set<number>();
  const normalized = pages.map((page) => {
    const source = canonicalById.get(page?.id);
    if (
      !source
      || seenIds.has(page.id)
      || typeof page.enabled !== "boolean"
      || !Number.isInteger(page.displayOrder)
      || page.displayOrder < 0
      || seenOrders.has(page.displayOrder)
      || !Number.isInteger(page.durationSeconds)
      || page.durationSeconds < 1
      || page.durationSeconds > 86_400
    ) {
      invalidDraft("Playback Profile Draft pages are invalid");
    }
    seenIds.add(page.id);
    seenOrders.add(page.displayOrder);
    return {
      ...source,
      displayOrder: page.displayOrder,
      durationSeconds: page.durationSeconds,
      enabled: page.enabled
    };
  });
  return normalized.sort((left, right) => left.displayOrder - right.displayOrder);
}

function validateDraftSnapshot(
  profileId: number,
  input: { pages: PlaybackPage[]; settings: PlaybackSettings },
  options: { trustedUpdatedAt?: string } = {}
): PlaybackProfileSnapshot {
  const pages = validateDraftPages(profileId, input.pages);
  const settings = validateDraftSettings(
    input.settings,
    options.trustedUpdatedAt ?? new Date().toISOString()
  );
  return { pages, settings };
}

function serializeVersion(row: VersionRow): PlaybackProfileVersion {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    id: row.id,
    profileId: row.profile_id,
    rollbackFromVersionId: row.rollback_from_version_id,
    schemaVersion: 1,
    snapshot: JSON.parse(row.snapshot_json) as PlaybackProfileSnapshot,
    versionNumber: row.version_number
  };
}

export function listPlaybackProfiles(): PlaybackProfileSummary[] {
  return (getDatabase()
    .prepare(
      `SELECT id, profile_key, name, is_default, archived_at
       FROM playback_profiles ORDER BY is_default DESC, id ASC`
    )
    .all() as Array<ReturnType<typeof requireProfile>>).map(serializeProfile);
}

export function createPlaybackProfile(input: { name: string }): PlaybackProfileSummary {
  const name = input.name.trim();
  if (!name) {
    throw new PlaybackProfileGovernanceError(
      "profile_name_required",
      "Playback Profile name is required",
      400
    );
  }
  const db = getDatabase();
  const defaultId = readDefaultPlaybackProfileId();
  const createdId = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO playback_profiles (profile_key, name, is_default)
         VALUES (?, ?, 0)`
      )
      .run(`profile-${randomUUID()}`, name);
    const profileId = Number(result.lastInsertRowid);
    db.prepare(
      `INSERT INTO playback_profile_settings (
         profile_id, autoplay, loop, start_page, transition_type,
         transition_speed, schedule_enabled, schedule_start, schedule_end,
         repeat_days, idle_mode, idle_timeout, brightness, orientation,
         enforce_fresh_runtime_data, updated_at
       )
       SELECT ?, autoplay, loop, start_page, transition_type,
         transition_speed, schedule_enabled, schedule_start, schedule_end,
         repeat_days, idle_mode, idle_timeout, brightness, orientation,
         enforce_fresh_runtime_data, CURRENT_TIMESTAMP
       FROM playback_profile_settings WHERE profile_id = ?`
    ).run(profileId, defaultId);
    db.prepare(
      `INSERT INTO playback_profile_pages (
         profile_id, page_id, enabled, display_order, duration_seconds
       )
       SELECT ?, page_id, enabled, display_order, duration_seconds
       FROM playback_profile_pages WHERE profile_id = ?`
    ).run(profileId, defaultId);
    return profileId;
  })();
  ensureDraft(createdId);
  return serializeProfile(requireProfile(createdId));
}

export function renamePlaybackProfile(profileId: number, name: string) {
  const profile = requireProfile(profileId);
  const normalized = name.trim();
  if (!normalized) {
    throw new PlaybackProfileGovernanceError(
      "profile_name_required",
      "Playback Profile name is required",
      400
    );
  }
  getDatabase()
    .prepare("UPDATE playback_profiles SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(normalized, profile.id);
  return serializeProfile(requireProfile(profileId));
}

export function archivePlaybackProfile(profileId: number) {
  const profile = requireProfile(profileId);
  if (profile.is_default === 1) {
    throw new PlaybackProfileGovernanceError(
      "default_profile_protected",
      "Default Playback Profile cannot be archived",
      409
    );
  }
  const inUse = getDatabase()
    .prepare("SELECT 1 FROM device_groups WHERE playback_profile_id = ? LIMIT 1")
    .get(profileId);
  if (inUse) {
    throw new PlaybackProfileGovernanceError(
      "profile_in_use",
      "Playback Profile is assigned to a Device Group",
      409
    );
  }
  getDatabase()
    .prepare(
      "UPDATE playback_profiles SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(profileId);
  return serializeProfile(requireProfile(profileId));
}

export function readPlaybackProfileDraft(profileId: number): PlaybackProfileDraft {
  ensureDraft(profileId);
  return serializeDraft(
    getDatabase()
      .prepare(
        `SELECT profile_id, revision, settings_json, pages_json, updated_at
         FROM playback_profile_drafts WHERE profile_id = ?`
      )
      .get(profileId) as DraftRow
  );
}

export function savePlaybackProfileDraft(
  profileId: number,
  input: {
    expectedRevision: number;
    pages: PlaybackPage[];
    settings: PlaybackSettings;
  }
): PlaybackProfileDraft {
  const current = readPlaybackProfileDraft(profileId);
  if (input.expectedRevision !== current.revision) {
    throw new PlaybackProfileGovernanceError(
      "profile_draft_conflict",
      "Playback Profile Draft changed since it was loaded",
      409,
      current.revision
    );
  }
  const snapshot = validateDraftSnapshot(profileId, input);
  const result = getDatabase()
    .prepare(
      `UPDATE playback_profile_drafts
       SET revision = revision + 1,
           settings_json = ?,
           pages_json = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE profile_id = ? AND revision = ?`
    )
    .run(
      JSON.stringify(snapshot.settings),
      JSON.stringify(snapshot.pages),
      profileId,
      input.expectedRevision
    );
  if (result.changes !== 1) {
    const latest = readPlaybackProfileDraft(profileId);
    throw new PlaybackProfileGovernanceError(
      "profile_draft_conflict",
      "Playback Profile Draft changed since it was loaded",
      409,
      latest.revision
    );
  }
  return readPlaybackProfileDraft(profileId);
}

export function synchronizeDefaultPlaybackProfileDraft() {
  const profileId = readDefaultPlaybackProfileId();
  ensureDraft(profileId);
  const snapshot = snapshotFromCurrent(profileId);
  getDatabase()
    .prepare(
      `UPDATE playback_profile_drafts
       SET revision = revision + 1,
           settings_json = ?,
           pages_json = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE profile_id = ?`
    )
    .run(
      JSON.stringify(snapshot.settings),
      JSON.stringify(snapshot.pages),
      profileId
    );
  return readPlaybackProfileDraft(profileId);
}

function buildSitePreview(
  draft: PlaybackProfileDraft,
  siteScope: "cl" | "kn",
  mqttStatus: { connected: boolean; reason: string | null }
): PlaybackProfileSitePreview {
  const evaluated = evaluatePlaybackSnapshot({
    mqttStatus,
    pages: draft.pages,
    settings: draft.settings,
    siteScope
  });
  const skipped = evaluated.skippedPages.map((page) => ({
    ...page,
    detail: page.detail ?? null
  }));
  const freshnessReasons = new Set([
    "derived-metric-missing",
    "mqtt-mapping-missing",
    "stale-runtime"
  ]);
  const readinessReasons = new Set([
    "asset-unhealthy",
    "data-not-ready",
    "slot-binding-conflict",
    "slot-binding-missing",
    "unpublished"
  ]);
  return {
    configured: draft.pages,
    diagnostics: {
      fallback: evaluated.fallbackRoute ? [evaluated.fallbackRoute] : [],
      freshness: skipped
        .filter((page) => freshnessReasons.has(page.skipReason))
        .map((page) => `${page.pageKey}:${page.skipReason}${page.detail ? `:${page.detail}` : ""}`),
      readiness: skipped
        .filter((page) => readinessReasons.has(page.skipReason))
        .map((page) => `${page.pageKey}:${page.skipReason}${page.detail ? `:${page.detail}` : ""}`),
      site: skipped
        .filter((page) => page.skipReason === "site-scope")
        .map((page) => `${page.pageKey}:site-scope`)
    },
    effective: evaluated.playablePages,
    siteScope,
    skipped
  };
}

export function previewPlaybackProfileDraft(
  profileId: number,
  options: {
    mqttStatus?: { connected: boolean; reason: string | null };
  } = {}
): PlaybackProfilePreview {
  const draft = readPlaybackProfileDraft(profileId);
  const mqttStatus = options.mqttStatus ?? {
    connected: false,
    reason: "unavailable"
  };
  return {
    cl: buildSitePreview(draft, "cl", mqttStatus),
    kn: buildSitePreview(draft, "kn", mqttStatus),
    profileId,
    revision: draft.revision
  };
}

function validateSnapshot(snapshot: PlaybackProfileSnapshot) {
  const enabledPages = snapshot.pages.filter((page) => page.enabled);
  if (
    enabledPages.length === 0
    || !enabledPages.some((page) => page.id === snapshot.settings.startPage)
  ) {
    throw new PlaybackProfileGovernanceError(
      "profile_publish_invalid",
      "Profile Draft requires an enabled start page",
      400
    );
  }
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
  if (
    snapshot.settings.scheduleEnabled
    && (
      !snapshot.settings.scheduleStart
      || !snapshot.settings.scheduleEnd
      || !clockPattern.test(snapshot.settings.scheduleStart)
      || !clockPattern.test(snapshot.settings.scheduleEnd)
    )
  ) {
    throw new PlaybackProfileGovernanceError(
      "profile_publish_invalid",
      "Profile Draft schedule is invalid",
      400
    );
  }
}

function validateEffectiveSnapshot(
  snapshot: PlaybackProfileSnapshot,
  options: {
    mqttStatus: { connected: boolean; reason: string | null };
    now: Date;
  }
) {
  const hasEffectivePage = (["cl", "kn"] as const).some((siteScope) => (
    evaluatePlaybackSnapshot({
      mqttStatus: options.mqttStatus,
      now: options.now,
      pages: snapshot.pages,
      settings: snapshot.settings,
      siteScope
    }).playablePages.length > 0
  ));
  if (!hasEffectivePage) {
    throw new PlaybackProfileGovernanceError(
      "profile_publish_invalid",
      "Profile Draft has no effective page for either Site Scope",
      400
    );
  }
}

function appendVersion(input: {
  createdBy: string;
  profileId: number;
  rollbackFromVersionId: number | null;
  snapshot: PlaybackProfileSnapshot;
}) {
  const createdBy = input.createdBy.trim();
  if (!createdBy) {
    throw new PlaybackProfileGovernanceError(
      "profile_actor_required",
      "Profile Version actor is required",
      400
    );
  }
  validateSnapshot(input.snapshot);
  const db = getDatabase();
  const id = db.transaction(() => {
    const next = db
      .prepare(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS value
         FROM playback_profile_versions WHERE profile_id = ?`
      )
      .get(input.profileId) as { value: number };
    const result = db
      .prepare(
        `INSERT INTO playback_profile_versions (
           profile_id, version_number, schema_version, snapshot_json,
           created_by, rollback_from_version_id
         ) VALUES (?, ?, 1, ?, ?, ?)`
      )
      .run(
        input.profileId,
        next.value,
        JSON.stringify(input.snapshot),
        createdBy,
        input.rollbackFromVersionId
      );
    const versionId = Number(result.lastInsertRowid);
    assignDesiredProfileVersion(input.profileId, versionId, db);
    return versionId;
  })();
  return readPlaybackProfileVersion(input.profileId, id);
}

export function publishPlaybackProfile(
  profileId: number,
  input: {
    createdBy: string;
    expectedRevision: number;
    mqttStatus?: { connected: boolean; reason: string | null };
    now?: Date;
  }
) {
  const draft = readPlaybackProfileDraft(profileId);
  if (draft.revision !== input.expectedRevision) {
    throw new PlaybackProfileGovernanceError(
      "profile_draft_conflict",
      "Playback Profile Draft changed since it was loaded",
      409,
      draft.revision
    );
  }
  const snapshot = validateDraftSnapshot(profileId, draft, {
    trustedUpdatedAt: draft.settings.updatedAt ?? draft.updatedAt
  });
  validateEffectiveSnapshot(snapshot, {
    mqttStatus: input.mqttStatus ?? {
      connected: false,
      reason: "unavailable"
    },
    now: input.now ?? new Date()
  });
  return appendVersion({
    createdBy: input.createdBy,
    profileId,
    rollbackFromVersionId: null,
    snapshot
  });
}

export function listPlaybackProfileVersions(profileId: number) {
  requireProfile(profileId);
  return (getDatabase()
    .prepare(
      `SELECT id, profile_id, version_number, schema_version, snapshot_json,
              created_at, created_by, rollback_from_version_id
       FROM playback_profile_versions
       WHERE profile_id = ?
       ORDER BY version_number ASC`
    )
    .all(profileId) as VersionRow[]).map(serializeVersion);
}

export function readPlaybackProfileVersion(profileId: number, versionId: number) {
  const row = getDatabase()
    .prepare(
      `SELECT id, profile_id, version_number, schema_version, snapshot_json,
              created_at, created_by, rollback_from_version_id
       FROM playback_profile_versions
       WHERE profile_id = ? AND id = ?`
    )
    .get(profileId, versionId) as VersionRow | undefined;
  if (!row) {
    throw new PlaybackProfileGovernanceError(
      "profile_version_not_found",
      "Playback Profile Version was not found",
      404
    );
  }
  return serializeVersion(row);
}

export function rollbackPlaybackProfile(
  profileId: number,
  input: { createdBy: string; versionId: number }
) {
  const source = readPlaybackProfileVersion(profileId, input.versionId);
  return appendVersion({
    createdBy: input.createdBy,
    profileId,
    rollbackFromVersionId: source.id,
    snapshot: source.snapshot
  });
}
