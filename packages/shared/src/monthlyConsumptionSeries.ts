export type MonthlyPoint = {
  date: string;
  valueKwh: string | null;
};

export function buildMonthlyConsumptionSeries(points: MonthlyPoint[], month: string) {
  const ordered = [...points]
    .filter((point) => point.date.startsWith(month))
    .sort((left, right) => left.date.localeCompare(right.date));
  const invalid = ordered.some((point) => point.valueKwh === "NaN" || point.valueKwh === "Infinity");
  if (invalid) {
    return { quality: "error" as const, points: [] as MonthlyPoint[] };
  }
  return {
    quality: ordered.some((point) => point.valueKwh === null) ? "partial" as const : "exact" as const,
    points: ordered
  };
}
