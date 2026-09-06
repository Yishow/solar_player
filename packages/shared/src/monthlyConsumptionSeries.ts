export type MonthlyPoint = {
  date: string;
  valueKwh: string | null;
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
    return { quality: "exact" as const, points: [] as MonthlyPoint[] };
  }

  const calendar = enumerateDates(orderedDates[0]!, orderedDates[orderedDates.length - 1]!);
  const filled = calendar.map((date) => byDate.get(date) ?? { date, valueKwh: null });
  return {
    quality: filled.some((point) => point.valueKwh === null) ? "partial" as const : "exact" as const,
    points: filled
  };
}
