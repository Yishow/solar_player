import { formatDecimalString, parseDecimalString, parseSourceTimestamp, subtractDecimalString } from "./meterReading.js";
import { rejectCalendarOverride, type SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

export type PeriodKind = "day" | "month" | "year";

export type PeriodSelection = {
  kind: PeriodKind;
  year: number;
  month?: number;
  day?: number;
};

export type PeriodSample = {
  channelId: string;
  sourceTimestamp: string;
  valueKwh: string;
};

export type PeriodConsumptionQuality = "exact" | "estimated-boundary" | "partial" | "unavailable" | "invalid";

export type PeriodConsumptionResult = {
  profileRevision: number;
  quality: PeriodConsumptionQuality;
  siteTimeZone: string;
  valueKwh: string | null;
};

const DEFAULT_BOUNDARY_MAX_AGE_SECONDS = 300;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function civilUtcMs(local: string, timeZone: string) {
  const parsed = parseSourceTimestamp(local, timeZone);
  if (!parsed.instant) {
    throw Object.assign(new Error("PERIOD_BOUNDARY_INVALID"), { code: "PERIOD_BOUNDARY_INVALID" });
  }
  return Date.parse(parsed.instant);
}

function nextCivilDate(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + 1));
  return { day: utc.getUTCDate(), month: utc.getUTCMonth() + 1, year: utc.getUTCFullYear() };
}

export function periodWindow(period: PeriodSelection, siteTimeZone: string) {
  if (period.kind === "day") {
    const month = period.month ?? 1;
    const day = period.day ?? 1;
    const next = nextCivilDate(period.year, month, day);
    return {
      endMs: civilUtcMs(`${next.year}-${pad(next.month)}-${pad(next.day)}T00:00:00`, siteTimeZone),
      startMs: civilUtcMs(`${period.year}-${pad(month)}-${pad(day)}T00:00:00`, siteTimeZone)
    };
  }
  if (period.kind === "month") {
    const month = period.month ?? 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? period.year + 1 : period.year;
    return {
      endMs: civilUtcMs(`${nextYear}-${pad(nextMonth)}-01T00:00:00`, siteTimeZone),
      startMs: civilUtcMs(`${period.year}-${pad(month)}-01T00:00:00`, siteTimeZone)
    };
  }
  return {
    endMs: civilUtcMs(`${period.year + 1}-01-01T00:00:00`, siteTimeZone),
    startMs: civilUtcMs(`${period.year}-01-01T00:00:00`, siteTimeZone)
  };
}

function sampleMs(sample: PeriodSample) {
  return Date.parse(sample.sourceTimestamp);
}

function lastAtOrBefore(series: PeriodSample[], instantMs: number) {
  let found: PeriodSample | null = null;
  for (const sample of series) {
    const time = sampleMs(sample);
    if (Number.isFinite(time) && time <= instantMs) {
      found = sample;
    }
  }
  return found;
}

export function resolvePeriodConsumption(input: {
  asOf: string;
  boundaryMaxAgeSeconds?: number;
  meterIds: string[];
  period: PeriodSelection;
  profile: SiteEnergyProfileV1;
  samples: PeriodSample[];
  timeZone?: string;
  start?: string;
  end?: string;
}): PeriodConsumptionResult {
  const override = rejectCalendarOverride({
    end: input.end,
    start: input.start,
    timeZone: input.timeZone
  });
  if (!override.ok) {
    throw Object.assign(new Error(override.message), { code: "CALENDAR_OVERRIDE_REJECTED" });
  }
  const allowed = new Set(input.profile.siteTotal.memberChannelIds);
  for (const meterId of input.meterIds) {
    if (!allowed.has(meterId)) {
      throw Object.assign(new Error(`meterId ${meterId} is outside the profile membership`), { code: "METER_NOT_IN_PROFILE" });
    }
  }
  if (input.profile.revision < 1) {
    throw Object.assign(new Error("UNKNOWN_PROFILE_REVISION"), { code: "UNKNOWN_PROFILE_REVISION" });
  }

  const maxAgeMs = (input.boundaryMaxAgeSeconds ?? DEFAULT_BOUNDARY_MAX_AGE_SECONDS) * 1000;
  const window = periodWindow(input.period, input.profile.siteTimeZone);
  const asOfMs = Date.parse(input.asOf);
  const closeCapMs = Number.isFinite(asOfMs) ? Math.min(window.endMs, asOfMs) : window.endMs;

  let total: string | null = null;
  let quality: PeriodConsumptionQuality = "exact";
  for (const meterId of input.meterIds) {
    const series = input.samples
      .filter((sample) => sample.channelId === meterId)
      .sort((left, right) => left.sourceTimestamp.localeCompare(right.sourceTimestamp));
    const opening = lastAtOrBefore(series, window.startMs);
    const closing = lastAtOrBefore(series, closeCapMs);
    if (!opening || window.startMs - sampleMs(opening) > maxAgeMs) {
      return {
        profileRevision: input.profile.revision,
        quality: series.some((sample) => sampleMs(sample) > window.startMs && sampleMs(sample) <= closeCapMs)
          ? "partial"
          : "unavailable",
        siteTimeZone: input.profile.siteTimeZone,
        valueKwh: null
      };
    }
    if (!closing || sampleMs(closing) < sampleMs(opening)) {
      return {
        profileRevision: input.profile.revision,
        quality: "partial",
        siteTimeZone: input.profile.siteTimeZone,
        valueKwh: null
      };
    }
    if (sampleMs(opening) < window.startMs) {
      quality = "estimated-boundary";
    }
    const delta = subtractDecimalString(closing.valueKwh, opening.valueKwh);
    if (delta.startsWith("-")) {
      return {
        profileRevision: input.profile.revision,
        quality: "invalid",
        siteTimeZone: input.profile.siteTimeZone,
        valueKwh: null
      };
    }
    total = total ? addDecimal(total, delta) : delta;
  }

  return {
    profileRevision: input.profile.revision,
    quality,
    siteTimeZone: input.profile.siteTimeZone,
    valueKwh: total
  };
}

function addDecimal(left: string, right: string) {
  return formatDecimalString(parseDecimalString(left) + parseDecimalString(right));
}
