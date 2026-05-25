import type {
  ConfigStage,
  ManagementDraftSaveConflict,
  PublicShellDecorationConfig,
  ShellDecorationChannel,
  ShellDecorationEnvelope,
  ShellDecorationObject,
  ValidationResult
} from "@solar-display/shared";
import {
  createDefaultShellDecorationEnvelope,
  isShellDecorationObjectShape,
  toPublicShellDecorationConfig,
  validateShellDecorationChannel
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

const SHELL_DECORATION_RESOURCE_ID = "shell-decorations";

export class ShellDecorationDraftSaveConflictError extends Error {
  readonly code = "management_draft_conflict";
  readonly conflict: ManagementDraftSaveConflict<ShellDecorationEnvelope>;
  readonly statusCode = 409;

  constructor(conflict: ManagementDraftSaveConflict<ShellDecorationEnvelope>) {
    super("Draft save conflict");
    this.name = "ShellDecorationDraftSaveConflictError";
    this.conflict = conflict;
  }
}

type ShellDecorationRow = {
  config_json: string;
  version: number;
  updated_at: string | null;
  published_at: string | null;
  published_by: string | null;
};

function createCorruptShellConfigError(stage: ConfigStage): Error {
  const error = new Error(`Shell decoration ${stage} config is corrupted and cannot be parsed`);
  // @ts-expect-error fastify reads statusCode
  error.statusCode = 500;
  return error;
}

function parseStoredObjects(value: unknown, stage: ConfigStage): ShellDecorationObject[] {
  // A row written by this service always carries a real array per band, so a
  // missing key or any structurally invalid entry signals genuine corruption.
  if (!Array.isArray(value)) {
    throw createCorruptShellConfigError(stage);
  }
  for (const item of value) {
    if (!isShellDecorationObjectShape(item)) {
      throw createCorruptShellConfigError(stage);
    }
  }
  return value as ShellDecorationObject[];
}

function parseStoredChannel(raw: string, stage: ConfigStage): ShellDecorationChannel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw createCorruptShellConfigError(stage);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw createCorruptShellConfigError(stage);
  }
  const record = parsed as Record<string, unknown>;
  return {
    footerObjects: parseStoredObjects(record.footerObjects, stage),
    headerObjects: parseStoredObjects(record.headerObjects, stage)
  };
}

function readStageVersion(stage: ConfigStage): number {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT version FROM shell_decoration_stage_configs WHERE stage = ?`)
    .get(stage) as { version: number } | undefined;
  return row?.version ?? createDefaultShellDecorationEnvelope(stage).version;
}

function readStageEnvelopeOrDefault(stage: ConfigStage): ShellDecorationEnvelope {
  try {
    return readShellDecorationStage(stage);
  } catch {
    return createDefaultShellDecorationEnvelope(stage);
  }
}

export function readShellDecorationStage(stage: ConfigStage): ShellDecorationEnvelope {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT config_json, version, updated_at, published_at, published_by
       FROM shell_decoration_stage_configs WHERE stage = ?`
    )
    .get(stage) as ShellDecorationRow | undefined;

  if (!row) {
    return createDefaultShellDecorationEnvelope(stage);
  }

  const channel = parseStoredChannel(row.config_json, stage);
  return {
    footerObjects: channel.footerObjects,
    headerObjects: channel.headerObjects,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    stage,
    updatedAt: row.updated_at,
    version: row.version
  };
}

export function writeShellDecorationDraft(
  channel: ShellDecorationChannel,
  baseVersion: number
): ShellDecorationEnvelope {
  if (typeof baseVersion !== "number" || !Number.isInteger(baseVersion) || baseVersion < 1) {
    const error = new Error("baseVersion must be a positive integer");
    // @ts-expect-error fastify reads statusCode
    error.statusCode = 400;
    throw error;
  }

  const db = getDatabase();
  const current = readShellDecorationStage("draft");

  if (current.version !== baseVersion) {
    throw new ShellDecorationDraftSaveConflictError({
      baseVersion,
      currentVersion: current.version,
      latestEnvelope: current,
      resourceId: SHELL_DECORATION_RESOURCE_ID,
      resourceType: "shell-decoration-draft"
    });
  }

  const nextVersion = current.version + 1;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO shell_decoration_stage_configs (stage, config_json, version, updated_at)
     VALUES ('draft', ?, ?, ?)
     ON CONFLICT(stage) DO UPDATE SET
       config_json = excluded.config_json,
       version = excluded.version,
       updated_at = excluded.updated_at`
  ).run(JSON.stringify({ footerObjects: channel.footerObjects, headerObjects: channel.headerObjects }), nextVersion, now);

  return readShellDecorationStage("draft");
}

export function publishShellDecorationDraft(
  publishedBy?: string
): { live: ShellDecorationEnvelope; validation: ValidationResult } {
  const draft = readShellDecorationStage("draft");
  const channel: ShellDecorationChannel = {
    footerObjects: draft.footerObjects,
    headerObjects: draft.headerObjects
  };
  const validation = validateShellDecorationChannel(channel);

  if (!validation.canPublish) {
    // A corrupt live row must not mask the draft validation feedback.
    return { live: readStageEnvelopeOrDefault("live"), validation };
  }

  const db = getDatabase();
  // Read only the live version (no JSON parse) so a corrupt live row can still
  // be healed by publishing a known-good draft over it.
  const nextVersion = readStageVersion("live") + 1;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO shell_decoration_stage_configs (stage, config_json, version, updated_at, published_at, published_by)
     VALUES ('live', ?, ?, ?, ?, ?)
     ON CONFLICT(stage) DO UPDATE SET
       config_json = excluded.config_json,
       version = excluded.version,
       updated_at = excluded.updated_at,
       published_at = excluded.published_at,
       published_by = excluded.published_by`
  ).run(JSON.stringify(channel), nextVersion, now, now, publishedBy ?? null);

  return { live: readShellDecorationStage("live"), validation };
}

export function readPublicShellDecorationConfig(): PublicShellDecorationConfig {
  return toPublicShellDecorationConfig(readShellDecorationStage("live"));
}
