export type GenerationTrendAxisLabel = { label: string; position: number };

export type GenerationTrendPeak = { index: number; value: number; position: number };

// Fixed intraday ticks matching the 24-point hourly generation window.
export function buildGenerationTrendAxisLabels(): GenerationTrendAxisLabel[] {
  return [
    { label: "00:00", position: 0 },
    { label: "06:00", position: 25 },
    { label: "12:00", position: 50 },
    { label: "18:00", position: 75 },
    { label: "24:00", position: 100 }
  ];
}

export type GenerationTrendYTick = { value: number; position: number };

export type GenerationTrendCoordinate = { x: number; y: number };

function resolveSeriesHour(hours: number[] | undefined, index: number, seriesLength: number) {
  if (hours && hours.length === seriesLength) {
    const value = hours[index];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  if (seriesLength <= 1) {
    return 0;
  }

  return (index / (seriesLength - 1)) * 24;
}

function niceCeil(value: number): number {
  if (value <= 0) {
    return 0;
  }

  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    if (multiple * base >= value) {
      return multiple * base;
    }
  }
  return 10 * base;
}

// Value-axis ticks from a nice rounded maximum (top, position 0) down to zero
// (bottom, position 100), so the chart can draw gridlines and scale labels.
export function buildGenerationTrendYTicks(series: number[], count = 3): GenerationTrendYTick[] {
  const tickCount = Math.max(count, 2);
  const peak = series.length > 0 ? Math.max(...series) : 0;
  const niceMax = niceCeil(peak);

  return Array.from({ length: tickCount }, (_, index) => ({
    value: (niceMax * (tickCount - 1 - index)) / (tickCount - 1),
    position: (index / (tickCount - 1)) * 100
  }));
}

// Maps each sample to plot coordinates that fill the height: zero near the
// bottom, the nice maximum near the top, with a small top/bottom margin.
export function mapGenerationTrendCoordinates(
  series: number[],
  niceMax: number,
  hours?: number[]
): GenerationTrendCoordinate[] {
  if (series.length === 0) {
    return [];
  }

  const scaleMax = niceMax > 0 ? niceMax : 1;
  return series.map((value, index) => ({
    x: (resolveSeriesHour(hours, index, series.length) / 24) * 100,
    y: 100 - (value / scaleMax) * 90 - 5
  }));
}

export function findGenerationTrendPeak(series: number[], hours?: number[]): GenerationTrendPeak | null {
  if (series.length === 0) {
    return null;
  }

  let peakIndex = 0;
  for (let index = 1; index < series.length; index += 1) {
    if (series[index]! > series[peakIndex]!) {
      peakIndex = index;
    }
  }

  const position = (resolveSeriesHour(hours, peakIndex, series.length) / 24) * 100;
  return { index: peakIndex, value: series[peakIndex]!, position };
}
