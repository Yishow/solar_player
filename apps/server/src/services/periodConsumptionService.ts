import type Database from "better-sqlite3";
import {
  buildMonthlyConsumptionSeries,
  monthBoundaryInProfileZone,
  resolvePeriodConsumption,
  type PeriodSelection,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { getActiveProfile } from "./siteEnergyProfileService.js";

function loadAcceptedSamples(database: Database.Database, scope: "cl" | "kn") {
  return (database.prepare(`
    SELECT channel_id, source_timestamp, normalized_value_kwh
    FROM meter_readings_accepted
    WHERE metric_scope = ? AND source_timestamp IS NOT NULL
    ORDER BY source_timestamp
  `).all(scope) as Array<{ channel_id: string; source_timestamp: string; normalized_value_kwh: string }>).map((row) => ({
    channelId: row.channel_id,
    sourceTimestamp: row.source_timestamp,
    valueKwh: row.normalized_value_kwh
  }));
}

export function calendarPartsInProfileZone(instantUtc: string, siteTimeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: siteTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(instantUtc));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: Number(read("day")),
    month: Number(read("month")),
    year: Number(read("year"))
  };
}

export function periodSelectionFromRange(
  range: "day" | "week" | "month" | "year" | "total",
  asOf: string,
  siteTimeZone: string
): PeriodSelection | null {
  const parts = calendarPartsInProfileZone(asOf, siteTimeZone);
  if (range === "day") {
    return { day: parts.day, kind: "day", month: parts.month, year: parts.year };
  }
  if (range === "month") {
    return { kind: "month", month: parts.month, year: parts.year };
  }
  if (range === "year" || range === "total") {
    return { kind: "year", year: parts.year };
  }
  return null;
}

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
  return resolvePeriodConsumption({
    asOf,
    meterIds: profile.siteTotal.memberChannelIds,
    period,
    profile,
    samples: loadAcceptedSamples(database, scope)
  });
}

export function tryResolvePersistedPeriodConsumption(
  database: Database.Database,
  scope: string,
  range: "day" | "week" | "month" | "year" | "total",
  asOf: string
) {
  if (scope !== "cl" && scope !== "kn") {
    return null;
  }
  const profile = getActiveProfile(database, scope);
  if (!profile) {
    return null;
  }
  const period = periodSelectionFromRange(range, asOf, profile.siteTimeZone);
  if (!period) {
    return null;
  }
  try {
    return resolvePersistedPeriodConsumption(database, scope, period, asOf);
  } catch {
    return null;
  }
}

export function resolveDailyConsumptionSeries(
  database: Database.Database,
  scope: "cl" | "kn",
  month: string,
  asOf: string
) {
  const profile = getActiveProfile(database, scope);
  if (!profile) {
    return null;
  }
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) {
    return null;
  }
  const samples = loadAcceptedSamples(database, scope);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const points = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const result = resolvePeriodConsumption({
      asOf,
      meterIds: profile.siteTotal.memberChannelIds,
      period: { day, kind: "day", month: monthNumber, year },
      profile,
      samples
    });
    points.push({
      date: `${month}-${String(day).padStart(2, "0")}`,
      valueKwh: result.quality === "exact" ? result.valueKwh : null
    });
  }
  return {
    profileRevision: profile.revision,
    siteTimeZone: profile.siteTimeZone,
    ...buildMonthlyConsumptionSeries(points, month)
  };
}

export function monthKeyFromProfile(asOf: string, profile: Pick<SiteEnergyProfileV1, "siteTimeZone">) {
  return monthBoundaryInProfileZone(asOf, profile.siteTimeZone);
}
