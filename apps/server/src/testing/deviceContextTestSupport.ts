import type { SiteScope } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import {
  exchangePairingToken,
  issuePairingToken
} from "../services/deviceCredentialService.js";

let fixtureSequence = 0;

function normalizeToMwh(
  value: number,
  unit: string | null | undefined
) {
  switch (unit?.trim().toLowerCase()) {
    case "gwh":
      return value * 1_000;
    case "kwh":
      return value / 1_000;
    case "wh":
      return value / 1_000_000;
    default:
      return value;
  }
}

export function mirrorLegacyGenerationIntoSiteSummaryForTest(
  siteScope: SiteScope
) {
  const database = getDatabase();
  const liveRows = database
    .prepare(
      `SELECT metric_key, value, unit, timestamp
       FROM live_metric_values
       WHERE metric_scope = ?
         AND metric_key IN ('todayGeneration', 'totalGeneration')`
    )
    .all(siteScope) as Array<{
      metric_key: string;
      timestamp: string | null;
      unit: string | null;
      value: number | null;
    }>;
  const liveByKey = new Map(liveRows.map((row) => [row.metric_key, row]));
  const counter = database
    .prepare(
      `SELECT total_value
       FROM cumulative_counters
       WHERE metric_scope = ? AND metric_key = 'generation'`
    )
    .get(siteScope) as { total_value: number | null } | undefined;
  const daily = database
    .prepare(
      `SELECT generation_total
       FROM daily_energy_summaries
       WHERE metric_scope = ?
       ORDER BY date DESC
       LIMIT 1`
    )
    .get(siteScope) as { generation_total: number | null } | undefined;
  const totalRow = liveByKey.get("totalGeneration");
  const todayRow = liveByKey.get("todayGeneration");
  const totalMwh =
    typeof totalRow?.value === "number"
      ? normalizeToMwh(totalRow.value, totalRow.unit)
      : typeof counter?.total_value === "number"
        ? counter.total_value / 1_000
        : null;
  const todayMwh =
    typeof todayRow?.value === "number"
      ? normalizeToMwh(todayRow.value, todayRow.unit)
      : typeof daily?.generation_total === "number"
        ? daily.generation_total / 1_000
        : 0;

  if (totalMwh === null) {
    return;
  }

  const timestamp =
    liveRows
      .map((row) => row.timestamp)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? new Date().toISOString();
  const upsert = database.prepare(
    `INSERT INTO live_metric_values (
       metric_scope, metric_key, value, unit, timestamp, quality, raw_payload
     ) VALUES (?, ?, ?, 'MWh', ?, 'good', ?)
     ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
       value = excluded.value,
       unit = excluded.unit,
       timestamp = excluded.timestamp,
       quality = excluded.quality,
       raw_payload = excluded.raw_payload`
  );
  for (const [suffix, value] of [
    ["todayMwh", todayMwh],
    ["monthMwh", totalMwh],
    ["totalMwh", totalMwh]
  ] as const) {
    upsert.run(
      siteScope,
      `factoryGeneration.${suffix}`,
      value,
      timestamp,
      JSON.stringify({ timestamp })
    );
  }
}

export function createPairedDeviceTestContext(siteScope: SiteScope) {
  fixtureSequence += 1;
  const database = getDatabase();
  const profile = database
    .prepare("SELECT id FROM playback_profiles WHERE is_default = 1")
    .get() as { id: number };
  const groupId = Number(
    database
      .prepare(
        `INSERT INTO device_groups (
           name, enabled, site_scope, playback_profile_id
         ) VALUES (?, 1, ?, ?)`
      )
      .run(
        `Test ${siteScope.toUpperCase()} Group ${fixtureSequence}`,
        siteScope,
        profile.id
      ).lastInsertRowid
  );
  const deviceId = Number(
    database
      .prepare(
        `INSERT INTO devices (
           client_id, display_name, enabled, group_id
         ) VALUES (?, ?, 1, ?)`
      )
      .run(
        `test-${siteScope}-${fixtureSequence}`,
        `Test ${siteScope.toUpperCase()} Display ${fixtureSequence}`,
        groupId
      ).lastInsertRowid
  );
  const issue = issuePairingToken(deviceId);
  const exchange = exchangePairingToken(issue.token);

  return {
    clientId: `test-${siteScope}-${fixtureSequence}`,
    credential: exchange.credential,
    deviceId,
    groupId,
    profileId: profile.id,
    siteScope
  };
}
