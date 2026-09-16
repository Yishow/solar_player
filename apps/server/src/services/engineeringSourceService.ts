import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import {
  KN_ENGINEERING_IDS,
  KN_ENGINEERING_NAMES,
  buildDefaultEngineeringExactTopic,
  validateKnEngineeringSource,
  type EngineeringSourceDefinition,
  type KnEngineeringId
} from "@solar-display/shared";

export function computePreviewToken(draft: EngineeringSourceDefinition): string {
  const canonical = JSON.stringify({
    site: draft.site,
    engineeringId: draft.engineeringId,
    purpose: draft.purpose,
    mode: draft.mode,
    exactTopic: draft.exactTopic,
    approvedPublisherId: draft.approvedPublisherId,
    definitionRevision: draft.definitionRevision,
    calendarRevision: draft.calendarRevision,
    unit: draft.unit,
    expectedDelivery: draft.expectedDelivery,
    replayWindowDays: draft.replayWindowDays
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function rowToDefinition(row: any): EngineeringSourceDefinition {
  let expectedDelivery = null;
  if (row.expected_delivery_json) {
    try {
      expectedDelivery = JSON.parse(row.expected_delivery_json);
    } catch {
      expectedDelivery = null;
    }
  }
  return {
    sourceRef: row.source_ref,
    configurationRevision: row.configuration_revision,
    sourceKind: "engineering",
    site: "kn",
    engineeringId: row.engineering_id,
    engineeringName: row.engineering_name,
    purpose: row.purpose,
    mode: row.mode,
    exactTopic: row.exact_topic,
    approvedPublisherId: row.approved_publisher_id,
    definitionRevision: row.definition_revision,
    definitionSummary: row.definition_summary || "",
    scopeCoverage: row.scope_coverage || "department-aggregate",
    unit: row.unit,
    scaleDecimal: row.scale_decimal,
    qualityPolicy: row.quality_policy,
    calendarRevision: row.calendar_revision,
    expectedDelivery,
    replayWindowDays: row.replay_window_days,
    enabled: Boolean(row.enabled),
    reviewStatus: row.review_status
  };
}

export function listEngineeringSources(db: Database.Database): EngineeringSourceDefinition[] {
  const rows = db
    .prepare("SELECT * FROM engineering_source_definitions WHERE site = 'kn' ORDER BY engineering_id ASC")
    .all();

  const foundMap = new Map<string, EngineeringSourceDefinition>();
  for (const r of rows) {
    const def = rowToDefinition(r);
    foundMap.set(`${def.engineeringId}-${def.purpose}`, def);
  }

  const results: EngineeringSourceDefinition[] = [];
  for (const engId of KN_ENGINEERING_IDS) {
    // Each engineering has power and energy purposes
    for (const purpose of ["power", "energy"] as const) {
      const key = `${engId}-${purpose}`;
      const existing = foundMap.get(key);
      if (existing) {
        results.push(existing);
      } else {
        // synthesize unconfigured template
        results.push({
          sourceRef: `kn-eng-${engId}-${purpose}`,
          configurationRevision: 0,
          sourceKind: "engineering",
          site: "kn",
          engineeringId: engId,
          engineeringName: KN_ENGINEERING_NAMES[engId],
          purpose,
          mode: "unconfigured",
          exactTopic: buildDefaultEngineeringExactTopic(engId, purpose === "power" ? "power-gauge" : "daily-report"),
          approvedPublisherId: null,
          definitionRevision: 1,
          definitionSummary: "",
          scopeCoverage: "department-aggregate",
          unit: purpose === "power" ? "kW" : "kWh",
          scaleDecimal: 1,
          qualityPolicy: null,
          calendarRevision: 1,
          expectedDelivery: null,
          replayWindowDays: 93,
          enabled: false,
          reviewStatus: "draft"
        });
      }
    }
  }

  return results;
}

export function getEngineeringSourceByRef(
  db: Database.Database,
  sourceRef: string
): EngineeringSourceDefinition | null {
  const row = db
    .prepare("SELECT * FROM engineering_source_definitions WHERE source_ref = ?")
    .get(sourceRef);
  if (!row) return null;
  return rowToDefinition(row);
}

function readEngineeringSource(
  db: Database.Database,
  where: string,
  params: unknown[]
): EngineeringSourceDefinition | null {
  const row = db
    .prepare(`SELECT * FROM engineering_source_definitions WHERE ${where} LIMIT 1`)
    .get(...params);
  if (!row || typeof row !== "object" || typeof (row as { source_ref?: unknown }).source_ref !== "string") {
    return null;
  }
  return rowToDefinition(row);
}

function effectiveRegistrationPredicate() {
  return `
    site = 'kn'
    AND enabled = 1
    AND mode != 'unconfigured'
    AND review_status = 'approved'
    AND approved_publisher_id IS NOT NULL
    AND TRIM(approved_publisher_id) != ''
    AND TRIM(exact_topic) != ''
  `;
}

/** Returns the approved registration which owns an exact production topic. */
export function getEngineeringSourceByTopic(
  db: Database.Database,
  exactTopic: string,
  options: { effectiveOnly?: boolean } = {}
): EngineeringSourceDefinition | null {
  const where = options.effectiveOnly
    ? `${effectiveRegistrationPredicate()} AND exact_topic = ?`
    : "site = 'kn' AND exact_topic = ?";
  return readEngineeringSource(db, where, [exactTopic]);
}

/** Returns the approved energy registration used by report admission. */
export function getEffectiveEngineeringEnergySource(
  db: Database.Database,
  engineeringId: KnEngineeringId
): EngineeringSourceDefinition | null {
  return readEngineeringSource(
    db,
    `${effectiveRegistrationPredicate()}
     AND engineering_id = ?
     AND purpose = 'energy'
     AND mode IN ('daily-report', 'cumulative-energy')`,
    [engineeringId]
  );
}

export function previewEngineeringSource(
  draft: Partial<EngineeringSourceDefinition> & Record<string, unknown>
): { previewToken: string; canonicalDraft: EngineeringSourceDefinition } {
  const validation = validateKnEngineeringSource(draft);
  if (!validation.valid) {
    throw new Error(`Invalid engineering source: ${validation.errors.join("; ")}`);
  }
  const token = computePreviewToken(validation.source);
  return { previewToken: token, canonicalDraft: validation.source };
}

export function applyEngineeringSource(
  db: Database.Database,
  params: {
    previewToken: string;
    expectedRevision: number;
    draft: Partial<EngineeringSourceDefinition> & Record<string, unknown>;
  }
): { source: EngineeringSourceDefinition } {
  const preview = previewEngineeringSource(params.draft);
  if (preview.previewToken !== params.previewToken) {
    throw new Error("previewToken mismatch: source policy or binding changed since preview");
  }

  const draft = preview.canonicalDraft;

  return db.transaction(() => {
    const existingRow = db
      .prepare("SELECT * FROM engineering_source_definitions WHERE source_ref = ?")
      .get(draft.sourceRef) as any;

    if (existingRow) {
      if (existingRow.configuration_revision !== params.expectedRevision) {
        throw new Error(
          `Conflict: expected revision ${params.expectedRevision}, but found ${existingRow.configuration_revision}`
        );
      }
    } else {
      if (params.expectedRevision !== 0) {
        throw new Error(`Conflict: expected revision ${params.expectedRevision}, but record does not exist`);
      }
    }

    const nextRevision = (existingRow ? existingRow.configuration_revision : 0) + 1;

    db.prepare(`
      INSERT INTO engineering_source_definitions (
        source_ref, configuration_revision, site, engineering_id, engineering_name,
        purpose, mode, exact_topic, approved_publisher_id, definition_revision,
        definition_summary, scope_coverage, unit, scale_decimal, quality_policy,
        calendar_revision, expected_delivery_json, replay_window_days, enabled, review_status,
        updated_at
      ) VALUES (
        @source_ref, @configuration_revision, @site, @engineering_id, @engineering_name,
        @purpose, @mode, @exact_topic, @approved_publisher_id, @definition_revision,
        @definition_summary, @scope_coverage, @unit, @scale_decimal, @quality_policy,
        @calendar_revision, @expected_delivery_json, @replay_window_days, @enabled, @review_status,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(source_ref) DO UPDATE SET
        configuration_revision = @configuration_revision,
        engineering_name = @engineering_name,
        purpose = @purpose,
        mode = @mode,
        exact_topic = @exact_topic,
        approved_publisher_id = @approved_publisher_id,
        definition_revision = @definition_revision,
        definition_summary = @definition_summary,
        scope_coverage = @scope_coverage,
        unit = @unit,
        scale_decimal = @scale_decimal,
        quality_policy = @quality_policy,
        calendar_revision = @calendar_revision,
        expected_delivery_json = @expected_delivery_json,
        replay_window_days = @replay_window_days,
        enabled = @enabled,
        review_status = @review_status,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      source_ref: draft.sourceRef,
      configuration_revision: nextRevision,
      site: draft.site,
      engineering_id: draft.engineeringId,
      engineering_name: draft.engineeringName,
      purpose: draft.purpose,
      mode: draft.mode,
      exact_topic: draft.exactTopic,
      approved_publisher_id: draft.approvedPublisherId,
      definition_revision: draft.definitionRevision,
      definition_summary: draft.definitionSummary,
      scope_coverage: draft.scopeCoverage,
      unit: draft.unit,
      scale_decimal: draft.scaleDecimal,
      quality_policy: draft.qualityPolicy,
      calendar_revision: draft.calendarRevision,
      expected_delivery_json: draft.expectedDelivery ? JSON.stringify(draft.expectedDelivery) : null,
      replay_window_days: draft.replayWindowDays,
      enabled: draft.enabled ? 1 : 0,
      review_status: draft.reviewStatus
    });

    const updated = getEngineeringSourceByRef(db, draft.sourceRef);
    if (!updated) {
      throw new Error("Failed to load applied engineering source");
    }
    return { source: updated };
  })();
}

export function resolveEnabledEngineeringTopics(db: Database.Database): string[] {
  const rows = db
    .prepare(`SELECT exact_topic FROM engineering_source_definitions WHERE ${effectiveRegistrationPredicate()}`)
    .all() as Array<{ exact_topic: string }>;
  return Array.from(new Set(rows.map((r) => r.exact_topic.trim()).filter(Boolean)));
}
