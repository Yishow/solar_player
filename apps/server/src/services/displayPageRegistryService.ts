import type { DisplayPageInstance, DisplayPageTemplateKey } from "@solar-display/shared";
import { isDisplayPageTemplateKey } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

type DisplayPageRegistryRow = {
  id: number;
  archived_at: string | null;
  created_at: string | null;
  display_order: number;
  draft_version: number | null;
  duration_seconds: number;
  enabled: number;
  has_draft_changes: number;
  last_published_at: string | null;
  label_en: string;
  label_zh: string;
  live_version: number | null;
  page_key: string;
  route_slug: string;
  template_key: string;
  updated_at: string | null;
};

export type CreateDisplayPageInstanceInput = {
  displayNameEn: string;
  displayNameZh: string;
  displayOrder?: number;
  durationSeconds?: number;
  enabled?: boolean;
  routeSlug: string;
  templateKey: DisplayPageTemplateKey;
};

export type UpdateDisplayPageInstanceInput = {
  displayNameEn?: string;
  displayNameZh?: string;
  displayOrder?: number;
  durationSeconds?: number;
  enabled?: boolean;
  routeSlug?: string;
};

export class DisplayPageRegistryError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "DisplayPageRegistryError";
    this.statusCode = statusCode;
  }
}

function normalizeWhitespace(value: string) {
  return value.trim();
}

function assertNonEmptyValue(value: string, label: string) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length === 0) {
    throw new Error(`${label} is required`);
  }
  return normalized;
}

function resolveRouteSlug(routeSlug: string) {
  const normalized = assertNonEmptyValue(routeSlug, "Display page route slug").replace(/^\/+/, "");
  if (normalized.length === 0) {
    throw new Error("Display page route slug is required");
  }
  return normalized;
}

function serializeDisplayPageInstance(row: DisplayPageRegistryRow): DisplayPageInstance {
  if (!isDisplayPageTemplateKey(row.template_key)) {
    throw new Error(`Unsupported display page template: ${row.template_key}`);
  }

  return {
    id: row.id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    displayNameEn: row.label_en,
    displayNameZh: row.label_zh,
    displayOrder: row.display_order,
    draftVersion: row.draft_version,
    durationSeconds: row.duration_seconds,
    enabled: row.enabled === 1,
    hasDraftChanges: row.has_draft_changes === 1,
    lastPublishedAt: row.last_published_at,
    liveVersion: row.live_version,
    pageKey: row.page_key,
    route: `/${row.route_slug}`,
    routeSlug: row.route_slug,
    templateKey: row.template_key,
    updatedAt: row.updated_at
  };
}

function assertTemplateKeySupported(templateKey: string): asserts templateKey is DisplayPageTemplateKey {
  if (!isDisplayPageTemplateKey(templateKey)) {
    throw new DisplayPageRegistryError(`Unsupported display page template: ${templateKey}`, 400);
  }
}

function resolveNextDisplayOrder() {
  const row = getDatabase()
    .prepare("SELECT COALESCE(MAX(display_order), 0) AS max_display_order FROM display_page_registry")
    .get() as { max_display_order: number | null } | undefined;

  return Math.max(1, (row?.max_display_order ?? 0) + 1);
}

function readDisplayPageRegistryRow(pageKey: string) {
  return getDatabase()
    .prepare(
      `
        SELECT
          registry.id,
          registry.page_key,
          registry.template_key,
          registry.route_slug,
          registry.label_zh,
          registry.label_en,
          registry.enabled,
          registry.archived_at,
          registry.display_order,
          registry.duration_seconds,
          registry.created_at,
          registry.updated_at,
          draft.version AS draft_version,
          live.version AS live_version,
          live.published_at AS last_published_at,
          CASE
            WHEN draft.version IS NOT NULL AND live.version IS NULL THEN 1
            WHEN draft.version IS NOT NULL AND live.version IS NOT NULL AND draft.version != live.version THEN 1
            ELSE 0
          END AS has_draft_changes
        FROM display_page_registry AS registry
        LEFT JOIN display_page_stage_configs AS draft
          ON draft.page_key = registry.page_key AND draft.stage = 'draft'
        LEFT JOIN display_page_stage_configs AS live
          ON live.page_key = registry.page_key AND live.stage = 'live'
        WHERE registry.page_key = ?
      `
    )
    .get(pageKey) as DisplayPageRegistryRow | undefined;
}

function assertUniqueRouteSlug(routeSlug: string, currentPageKey?: string) {
  const existing = getDatabase()
    .prepare(
      `
        SELECT page_key
        FROM display_page_registry
        WHERE route_slug = ?
      `
    )
    .get(routeSlug) as { page_key: string } | undefined;

  if (!existing) {
    return;
  }

  if (currentPageKey && existing.page_key === currentPageKey) {
    return;
  }

  throw new DisplayPageRegistryError(`Display page route slug already exists: ${routeSlug}`, 409);
}

function allocateDisplayPageInstanceKey(templateKey: DisplayPageTemplateKey) {
  const rows = getDatabase()
    .prepare(
      `
        SELECT page_key
        FROM display_page_registry
        WHERE template_key = ?
      `
    )
    .all(templateKey) as Array<{ page_key: string }>;

  const usedSuffixes = new Set<number>();
  for (const row of rows) {
    if (row.page_key === templateKey) {
      usedSuffixes.add(1);
      continue;
    }

    const match = row.page_key.match(new RegExp(`^${templateKey}-(\\d+)$`));
    if (!match) {
      continue;
    }

    const suffix = Number.parseInt(match[1] ?? "", 10);
    if (Number.isInteger(suffix) && suffix > 1) {
      usedSuffixes.add(suffix);
    }
  }

  if (!usedSuffixes.has(1)) {
    return templateKey;
  }

  let suffix = 2;
  while (usedSuffixes.has(suffix)) {
    suffix += 1;
  }

  return `${templateKey}-${suffix}`;
}

function assertCanDisableTemplateInstance(templateKey: DisplayPageTemplateKey, pageKey: string) {
  const remainingActive = getDatabase()
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM display_page_registry
        WHERE template_key = ?
          AND page_key != ?
          AND enabled = 1
          AND archived_at IS NULL
      `
    )
    .get(templateKey, pageKey) as { total: number } | undefined;

  if ((remainingActive?.total ?? 0) > 0) {
    return;
  }

  throw new DisplayPageRegistryError(
    `Cannot archive or disable the last active display page for template: ${templateKey}`,
    409
  );
}

export function listDisplayPageInstances() {
  return (
    getDatabase()
      .prepare(
        `
          SELECT
            registry.id,
            registry.page_key,
            registry.template_key,
            registry.route_slug,
            registry.label_zh,
            registry.label_en,
            registry.enabled,
            registry.archived_at,
            registry.display_order,
            registry.duration_seconds,
            registry.created_at,
            registry.updated_at,
            draft.version AS draft_version,
            live.version AS live_version,
            live.published_at AS last_published_at,
            CASE
              WHEN draft.version IS NOT NULL AND live.version IS NULL THEN 1
              WHEN draft.version IS NOT NULL AND live.version IS NOT NULL AND draft.version != live.version THEN 1
              ELSE 0
            END AS has_draft_changes
          FROM display_page_registry AS registry
          LEFT JOIN display_page_stage_configs AS draft
            ON draft.page_key = registry.page_key AND draft.stage = 'draft'
          LEFT JOIN display_page_stage_configs AS live
            ON live.page_key = registry.page_key AND live.stage = 'live'
          ORDER BY registry.display_order ASC, registry.id ASC
        `
      )
      .all() as DisplayPageRegistryRow[]
  ).map(serializeDisplayPageInstance);
}

export function createDisplayPageInstance(input: CreateDisplayPageInstanceInput) {
  assertTemplateKeySupported(input.templateKey);

  const pageKey = allocateDisplayPageInstanceKey(input.templateKey);
  const routeSlug = resolveRouteSlug(input.routeSlug);
  assertUniqueRouteSlug(routeSlug);
  const displayNameZh = assertNonEmptyValue(input.displayNameZh, "Display page zh label");
  const displayNameEn = assertNonEmptyValue(input.displayNameEn, "Display page en label");
  const displayOrder =
    typeof input.displayOrder === "number" && Number.isFinite(input.displayOrder)
      ? Math.max(1, Math.floor(input.displayOrder))
      : resolveNextDisplayOrder();
  const durationSeconds =
    typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
      ? Math.max(1, Math.floor(input.durationSeconds))
      : 15;

  const database = getDatabase();
  const result = database
    .prepare(
      `
        INSERT INTO display_page_registry (
          page_key,
          template_key,
          route_slug,
          label_zh,
          label_en,
          enabled,
          archived_at,
          display_order,
          duration_seconds,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run(
      pageKey,
      input.templateKey,
      routeSlug,
      displayNameZh,
      displayNameEn,
      input.enabled === false ? 0 : 1,
      displayOrder,
      durationSeconds
    );

  const row = readDisplayPageRegistryRow(pageKey);

  if (!row) {
    throw new Error(`Failed to create display page instance: ${pageKey} (${String(result.lastInsertRowid)})`);
  }

  return serializeDisplayPageInstance(row);
}

export function readDisplayPageInstance(pageKey: string) {
  const row = readDisplayPageRegistryRow(pageKey);
  return row ? serializeDisplayPageInstance(row) : null;
}

export function updateDisplayPageInstance(pageKey: string, input: UpdateDisplayPageInstanceInput) {
  const current = readDisplayPageRegistryRow(pageKey);
  if (!current) {
    throw new DisplayPageRegistryError(`Unknown display page instance: ${pageKey}`, 404);
  }

  const nextRouteSlug = input.routeSlug === undefined ? current.route_slug : resolveRouteSlug(input.routeSlug);
  assertUniqueRouteSlug(nextRouteSlug, pageKey);
  const nextDisplayNameZh =
    input.displayNameZh === undefined
      ? current.label_zh
      : assertNonEmptyValue(input.displayNameZh, "Display page zh label");
  const nextDisplayNameEn =
    input.displayNameEn === undefined
      ? current.label_en
      : assertNonEmptyValue(input.displayNameEn, "Display page en label");
  const nextDisplayOrder =
    typeof input.displayOrder === "number" && Number.isFinite(input.displayOrder)
      ? Math.max(1, Math.floor(input.displayOrder))
      : current.display_order;
  const nextDurationSeconds =
    typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
      ? Math.max(1, Math.floor(input.durationSeconds))
      : current.duration_seconds;
  const nextEnabled = input.enabled === undefined ? current.enabled : input.enabled ? 1 : 0;

  if (nextEnabled === 0 && current.enabled === 1 && current.archived_at === null) {
    assertCanDisableTemplateInstance(current.template_key as DisplayPageTemplateKey, pageKey);
  }

  getDatabase()
    .prepare(
      `
        UPDATE display_page_registry
        SET
          route_slug = ?,
          label_zh = ?,
          label_en = ?,
          enabled = ?,
          display_order = ?,
          duration_seconds = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE page_key = ?
      `
    )
    .run(
      nextRouteSlug,
      nextDisplayNameZh,
      nextDisplayNameEn,
      nextEnabled,
      nextDisplayOrder,
      nextDurationSeconds,
      pageKey
    );

  const updated = readDisplayPageRegistryRow(pageKey);
  if (!updated) {
    throw new Error(`Failed to update display page instance: ${pageKey}`);
  }

  return serializeDisplayPageInstance(updated);
}

export function archiveDisplayPageInstance(pageKey: string) {
  const current = readDisplayPageRegistryRow(pageKey);
  if (!current) {
    throw new DisplayPageRegistryError(`Unknown display page instance: ${pageKey}`, 404);
  }

  if (current.archived_at === null && current.enabled === 1) {
    assertCanDisableTemplateInstance(current.template_key as DisplayPageTemplateKey, pageKey);
  }

  getDatabase()
    .prepare(
      `
        UPDATE display_page_registry
        SET
          enabled = 0,
          archived_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE page_key = ?
      `
    )
    .run(pageKey);

  const archived = readDisplayPageRegistryRow(pageKey);
  if (!archived) {
    throw new Error(`Failed to archive display page instance: ${pageKey}`);
  }

  return serializeDisplayPageInstance(archived);
}
