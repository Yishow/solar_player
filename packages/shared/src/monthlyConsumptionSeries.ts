export type MonthlyPoint = {
  date: string;
  valueKwh: string | null;
  quality?: "exact" | "estimated-boundary" | "partial" | "unavailable" | "invalid";
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

function isNonFiniteToken(value: string | null) {
  return value === "NaN" || value === "Infinity" || value === "-Infinity";
}

function enumerateDates(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function buildMonthlyConsumptionSeries(points: MonthlyPoint[], month: string) {
  const inMonth = points.filter((point) => point.date.startsWith(month) && ISO_DATE.test(point.date));
  if (inMonth.some((point) => isNonFiniteToken(point.valueKwh))) {
    return { quality: "error" as const, points: [] as MonthlyPoint[] };
  }

  const byDate = new Map<string, MonthlyPoint>();
  for (const point of [...inMonth].sort((left, right) => left.date.localeCompare(right.date))) {
    byDate.set(point.date, point);
  }
  const orderedDates = [...byDate.keys()];
  if (orderedDates.length === 0) {
    return { quality: "unavailable" as const, points: [] as MonthlyPoint[] };
  }

  const calendar = enumerateDates(orderedDates[0]!, orderedDates[orderedDates.length - 1]!);
  const filled = calendar.map((date) => byDate.get(date) ?? { date, valueKwh: null });
  const allUnavailableOrNull = filled.every((point) => point.valueKwh === null || point.quality === "unavailable");
  if (allUnavailableOrNull) {
    return { quality: "unavailable" as const, points: filled };
  }
  const hasNull = filled.some((point) => point.valueKwh === null || point.quality === "unavailable");
  const hasInvalid = filled.some((point) => point.quality === "invalid");
  const hasPartial = filled.some((point) => point.quality === "partial");
  const hasEstimated = filled.some((point) => point.quality === "estimated-boundary");
  const quality = hasInvalid
    ? ("invalid" as const)
    : (hasNull || hasPartial)
      ? ("partial" as const)
      : hasEstimated
        ? ("estimated-boundary" as const)
        : ("exact" as const);
  return {
    quality,
    points: filled
  };
}
