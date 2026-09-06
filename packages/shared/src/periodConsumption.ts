import { formatDecimalString, parseDecimalString, subtractDecimalString } from "./meterReading.js";
import { monthBoundaryInProfileZone, rejectCalendarOverride, type SiteEnergyProfileV1 } from "./siteEnergyProfile.js";

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

export type PeriodConsumptionResult = {
  profileRevision: number;
  quality: "exact" | "partial" | "unavailable" | "invalid";
  siteTimeZone: string;
  valueKwh: string | null;
};

export function resolvePeriodConsumption(input: {
  asOf: string;
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

  let total: string | null = null;
  for (const meterId of input.meterIds) {
    const series = input.samples
      .filter((sample) => sample.channelId === meterId)
      .sort((left, right) => left.sourceTimestamp.localeCompare(right.sourceTimestamp));
    const inPeriod = series.filter((sample) =>
      sampleBelongsToPeriod(sample.sourceTimestamp, input.period, input.profile.siteTimeZone)
    );
    if (inPeriod.length < 2) {
      return {
        profileRevision: input.profile.revision,
        quality: inPeriod.length === 0 ? "unavailable" : "partial",
        siteTimeZone: input.profile.siteTimeZone,
        valueKwh: null
      };
    }
    const start = inPeriod[0]!;
    const end = inPeriod[inPeriod.length - 1]!;
    const delta = subtractDecimalString(end.valueKwh, start.valueKwh);
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
    quality: "exact",
    siteTimeZone: input.profile.siteTimeZone,
    valueKwh: total
  };
}

function sampleBelongsToPeriod(instantUtc: string, period: PeriodSelection, siteTimeZone: string) {
  const month = monthBoundaryInProfileZone(instantUtc, siteTimeZone);
  const [year, monthPart] = month.split("-");
  if (period.kind === "year") {
    return year === String(period.year);
  }
  if (period.kind === "month") {
    return year === String(period.year) && Number(monthPart) === period.month;
  }
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: siteTimeZone,
    day: "2-digit"
  }).format(new Date(instantUtc));
  return year === String(period.year) && Number(monthPart) === period.month && Number(day) === period.day;
}

function addDecimal(left: string, right: string) {
  return formatDecimalString(parseDecimalString(left) + parseDecimalString(right));
}
