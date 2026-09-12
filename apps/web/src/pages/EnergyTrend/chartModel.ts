export type TrendChartPoint = { label: string; value: number | null };
const plot = { width: 272, height: 220, padding: 8 };

export function buildTrendChartModel(points: TrendChartPoint[], unit: string) {
  const validPoints = points.filter((point): point is { label: string; value: number } =>
    point.value !== null && Number.isFinite(point.value)
  );
  let min = 0;
  let max = unit === "%" ? 100 : 0;
  for (const point of validPoints) {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
  }
  if (min === max) max = min + 1;
  const format = new Intl.NumberFormat("zh-TW", { maximumSignificantDigits: 4 });
  return {
    plot,
    domain: { min, max },
    points: validPoints,
    ticks: [1, 2 / 3, 1 / 3, 0].map((ratio) => {
      const value = min + (max - min) * ratio;
      const y = plot.padding + (plot.height - plot.padding * 2) * (1 - ratio);
      return { value, ratio, y, label: `${format.format(value)}${unit === "%" ? "" : " "}${unit}` };
    })
  };
}

export type TrendChartModel = ReturnType<typeof buildTrendChartModel>;
