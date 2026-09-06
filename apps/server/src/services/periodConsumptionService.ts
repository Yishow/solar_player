import type Database from "better-sqlite3";
import {
  resolvePeriodConsumption,
  type PeriodSelection,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { getActiveProfile } from "./siteEnergyProfileService.js";

export function resolvePersistedPeriodConsumption(
  database: Database.Database,
  scope: "cl" | "kn",
  period: PeriodSelection,
  asOf: string
) {
  const profile = getActiveProfile(database, scope);
  if (!profile) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }
  const rows = database.prepare(`
    SELECT channel_id, source_timestamp, normalized_value_kwh
    FROM meter_readings_accepted
    WHERE metric_scope = ? AND source_timestamp IS NOT NULL
    ORDER BY source_timestamp
  `).all(scope) as Array<{ channel_id: string; source_timestamp: string; normalized_value_kwh: string }>;
  return resolvePeriodConsumption({
    asOf,
    meterIds: profile.siteTotal.memberChannelIds,
    period,
    profile,
    samples: rows.map((row) => ({
      channelId: row.channel_id,
      sourceTimestamp: row.source_timestamp,
      valueKwh: row.normalized_value_kwh
    }))
  });
}
