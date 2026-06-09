export type GenerationTrendRow = {
  generation: number | null;
  generation_power: number | null;
};

// Prefer instantaneous generation power (daily solar profile); fall back to the
// stored cumulative generation when no power history exists. Rows with neither
// value are skipped.
export function selectGenerationTrendSeries(rows: GenerationTrendRow[]): number[] {
  // All-or-nothing: once any instantaneous generation power exists in the window,
  // build the series from power only. Falling back to cumulative `generation`
  // (kWh) per-row would mix energy totals into an instantaneous-power (kW) trend
  // and spike the chart. Only when no power history exists at all do we fall back
  // to the previously stored cumulative series.
  const hasPower = rows.some((row) => typeof row.generation_power === "number");

  if (hasPower) {
    return rows.flatMap((row) => (typeof row.generation_power === "number" ? [row.generation_power] : []));
  }

  return rows.flatMap((row) => (typeof row.generation === "number" ? [row.generation] : []));
}

export type HourlyGenerationTrendRow = GenerationTrendRow & {
  captured_at: string;
};

export type HourlyGenerationTrendProfile = {
  hours: number[];
  series: number[];
  unit: "kW" | "kWh";
};

// Parse a captured_at into a Date using the *local* clock. The seed writes
// "YYYY-MM-DD HH:MM:SS" (local wall-clock, no zone) and the snapshot writer
// writes ISO "YYYY-MM-DDTHH:MM:SS.sssZ" (UTC). Replacing the space with "T"
// yields a zone-less ISO string that parses as local, while the UTC form keeps
// its "Z"; both then resolve to the same instant and the same *local* hour.
function parseCapturedAt(capturedAt: string): Date {
  return new Date(capturedAt.replace(" ", "T"));
}

function localHourKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Collapse raw snapshots into a daily profile: one point per *local* calendar
// hour using the latest reading in that hour, ordered chronologically for the
// latest local calendar day present in the data. When both power and cumulative
// readings exist, prefer whichever source covers more hourly buckets for that
// day; ties go to power so once runtime power catches up, the profile upgrades
// cleanly to the daily solar curve without regressing to a placeholder stub.
export function selectHourlyGenerationTrendSeries(rows: HourlyGenerationTrendRow[]): number[] {
  return selectHourlyGenerationTrendProfile(rows).series;
}

export function selectHourlyGenerationTrendProfile(
  rows: HourlyGenerationTrendRow[]
): HourlyGenerationTrendProfile {
  const parsedRows: Array<{ date: Date; row: HourlyGenerationTrendRow }> = [];
  let latestDate: Date | null = null;

  for (const row of rows) {
    const date = parseCapturedAt(row.captured_at);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    parsedRows.push({ date, row });
    if (latestDate === null || date.getTime() > latestDate.getTime()) {
      latestDate = date;
    }
  }

  if (!latestDate) {
    return { hours: [], series: [], unit: "kW" };
  }

  const latestDay = localDayKey(latestDate);
  const latestByHour = new Map<
    string,
    {
      generation: number | null;
      generationAt: number | null;
      generation_power: number | null;
      generationPowerAt: number | null;
      hour: number;
    }
  >();

  for (const { date, row } of parsedRows) {
    if (localDayKey(date) !== latestDay) {
      continue;
    }

    const key = localHourKey(date);
    const timestamp = date.getTime();
    const existing = latestByHour.get(key) ?? {
      generation: null,
      generationAt: null,
      generation_power: null,
      generationPowerAt: null,
      hour: date.getHours()
    };

    if (
      typeof row.generation === "number" &&
      (existing.generationAt === null || timestamp >= existing.generationAt)
    ) {
      existing.generation = row.generation;
      existing.generationAt = timestamp;
    }

    if (
      typeof row.generation_power === "number" &&
      (existing.generationPowerAt === null || timestamp >= existing.generationPowerAt)
    ) {
      existing.generation_power = row.generation_power;
      existing.generationPowerAt = timestamp;
    }

    latestByHour.set(key, existing);
  }

  const ordered = [...latestByHour.values()]
    .sort((a, b) => a.hour - b.hour);

  const powerEntries = ordered.flatMap((entry) =>
    typeof entry.generation_power === "number"
      ? [{ hour: entry.hour, value: entry.generation_power }]
      : []
  );
  const cumulativeEntries = ordered.flatMap((entry) =>
    typeof entry.generation === "number"
      ? [{ hour: entry.hour, value: entry.generation }]
      : []
  );

  if (powerEntries.length > 0 && powerEntries.length >= cumulativeEntries.length) {
    return {
      hours: powerEntries.map((entry) => entry.hour),
      series: powerEntries.map((entry) => entry.value),
      unit: "kW"
    };
  }

  return {
    hours: cumulativeEntries.map((entry) => entry.hour),
    series: cumulativeEntries.map((entry) => entry.value),
    unit: "kWh"
  };
}
