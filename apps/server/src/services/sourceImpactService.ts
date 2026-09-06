import type Database from "better-sqlite3";
import {
  evaluateSourceMutationImpact,
  type SourceImpactConsumer
} from "@solar-display/shared";
import { readMetricUsage } from "./metricUsageService.js";

function parseDraftBindings(configJson: string, pageId: string): SourceImpactConsumer[] {
  try {
    const parsed = JSON.parse(configJson) as { regions?: Record<string, unknown> };
    const regions = parsed.regions ?? parsed;
    const dataBindings = (regions as { dataBindings?: Record<string, { dataBinding?: { metricKey?: string }; itemId?: string }> }).dataBindings;
    if (!dataBindings || typeof dataBindings !== "object") {
      return [];
    }
    return Object.values(dataBindings).flatMap((item) => {
      const metricKey = item?.dataBinding?.metricKey;
      if (!metricKey) {
        return [];
      }
      return [{ kind: "draft" as const, itemId: item.itemId ?? null, metricKey, pageId }];
    });
  } catch {
    return [];
  }
}

export function readSourceImpact(
  database: Database.Database,
  input: { confirmResolved?: boolean; metricKey: string; metricScope: "cl" | "kn" | "global" | "all" }
) {
  try {
    const live = readMetricUsage(database, {
      metricKey: input.metricKey,
      scope: input.metricScope === "all" ? "all" : input.metricScope
    }).map((row): SourceImpactConsumer => ({
      kind: "live",
      itemId: row.itemId,
      labelZh: row.labelZh,
      metricKey: row.metricKey,
      pageId: row.pageId
    }));
    const draftRows = database.prepare(
      "SELECT page_key, config_json FROM display_page_stage_configs WHERE stage = 'draft'"
    ).all() as Array<{ config_json: string; page_key: string }>;
    const drafts = draftRows.flatMap((row) => parseDraftBindings(row.config_json, row.page_key))
      .filter((row) => row.metricKey === input.metricKey);
    const derivedRows = database.prepare(
      "SELECT derived_metric_key FROM derived_metric_inputs WHERE metric_key = ?"
    ).all(input.metricKey) as Array<{ derived_metric_key: string }>;
    const derived = derivedRows.map((row): SourceImpactConsumer => ({
      kind: "derived",
      metricKey: row.derived_metric_key
    }));
    const consumers = [...live, ...drafts, ...derived];
    return {
      ...evaluateSourceMutationImpact({
        confirmResolved: input.confirmResolved,
        consumers
      }),
      consumers
    };
  } catch {
    return evaluateSourceMutationImpact({ consumers: [], lookupFailed: true });
  }
}
