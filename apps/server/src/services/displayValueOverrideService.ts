import type {
  DisplayCardDataPageId,
  DisplayCardValueOverride,
  MetricScope
} from "@solar-display/shared";
import { formatMonitoringValue, scopedIdentityKey } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

export type DisplayValueOverrideTarget = {
  cardId: string;
  metricKey: string;
  pageId: DisplayCardDataPageId;
  targetId: string;
  unit: string | null;
  metricScope: MetricScope;
};

type DisplayValueOverrideRow = {
  card_id: string;
  metric_scope: MetricScope;
  display_value: number;
  enabled: number;
  expires_at: string | null;
  metric_key: string;
  page_id: DisplayCardDataPageId;
  reason: string | null;
  target_id: string;
  unit: string | null;
  updated_at: string;
};

function isActive(row: DisplayValueOverrideRow, now: Date) {
  if (row.enabled !== 1) {
    return false;
  }

  if (!row.expires_at) {
    return true;
  }

  const expiresAt = Date.parse(row.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

function serializeOverride(row: DisplayValueOverrideRow, now = new Date()): DisplayCardValueOverride {
  return {
    active: isActive(row, now),
    cardId: row.card_id,
    metricScope: row.metric_scope,
    displayValue: row.display_value,
    enabled: row.enabled === 1,
    expiresAt: row.expires_at,
    metricKey: row.metric_key,
    pageId: row.page_id,
    reason: row.reason,
    targetId: row.target_id,
    unit: row.unit,
    updatedAt: row.updated_at
  };
}

export function formatDisplayOverrideValue(value: number, unit: string | null) {
  return formatMonitoringValue(value, unit);
}

export function readDisplayValueOverrides(now = new Date()) {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          target_id,
          metric_scope,
          page_id,
          card_id,
          metric_key,
          display_value,
          unit,
          enabled,
          reason,
          expires_at,
          updated_at
        FROM display_value_overrides
      `
    )
    .all() as DisplayValueOverrideRow[];

  return new Map(
    rows.map((row) => [
      scopedIdentityKey(row.metric_scope, row.target_id),
      serializeOverride(row, now)
    ])
  );
}

export function readActiveDisplayValueOverrides(now = new Date()) {
  return new Map(
    [...readDisplayValueOverrides(now).entries()].filter((entry) => entry[1].active)
  );
}

export function saveDisplayValueOverride(
  target: DisplayValueOverrideTarget,
  input: {
    displayValue: number;
    expiresAt?: string | null;
    reason?: string | null;
    unit?: string | null;
  }
) {
  const unit = input.unit?.trim() || target.unit;
  const reason = input.reason?.trim() || null;
  const expiresAt = input.expiresAt?.trim() || null;

  getDatabase()
    .prepare(
      `
        INSERT INTO display_value_overrides (
          target_id,
          metric_scope,
          page_id,
          card_id,
          metric_key,
          display_value,
          unit,
          enabled,
          reason,
          expires_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(metric_scope, target_id) DO UPDATE SET
          page_id = excluded.page_id,
          card_id = excluded.card_id,
          metric_key = excluded.metric_key,
          display_value = excluded.display_value,
          unit = excluded.unit,
          enabled = 1,
          reason = excluded.reason,
          expires_at = excluded.expires_at,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(
      target.targetId,
      target.metricScope,
      target.pageId,
      target.cardId,
      target.metricKey,
      input.displayValue,
      unit,
      reason,
      expiresAt
    );
}

export function clearDisplayValueOverride(metricScope: MetricScope, targetId: string) {
  getDatabase()
    .prepare(
      `
        UPDATE display_value_overrides
        SET enabled = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE metric_scope = ? AND target_id = ?
      `
    )
    .run(metricScope, targetId);
}
