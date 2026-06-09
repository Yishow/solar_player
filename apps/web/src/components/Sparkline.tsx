import { memo } from "react";

type SparklineProps = {
  values: number[];
  className?: string;
  smooth?: boolean;
};

export type SparklineCoordinate = { x: number; y: number };

export function toSparklineCoordinates(values: number[]): SparklineCoordinate[] {
  if (values.length === 0) {
    return [];
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);

  return values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - ((value - min) / range) * 72 - 14;
    return { x, y };
  });
}

export function toSparklinePolyline(coords: SparklineCoordinate[]): string {
  return coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

// Catmull-Rom spline expressed as cubic beziers, with the endpoints duplicated
// so the curve starts and ends exactly on the first and last samples.
export function toSparklineSmoothPath(coords: SparklineCoordinate[]): string {
  if (coords.length === 0) {
    return "";
  }

  const first = coords[0]!;
  if (coords.length === 1) {
    return `M ${round(first.x)} ${round(first.y)}`;
  }

  let path = `M ${round(first.x)} ${round(first.y)}`;
  for (let index = 0; index < coords.length - 1; index += 1) {
    const p0 = coords[index - 1] ?? coords[index]!;
    const p1 = coords[index]!;
    const p2 = coords[index + 1]!;
    const p3 = coords[index + 2] ?? coords[index + 1]!;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${round(cp1x)} ${round(cp1y)}, ${round(cp2x)} ${round(cp2y)}, ${round(p2.x)} ${round(p2.y)}`;
  }

  return path;
}

export const Sparkline = memo(function Sparkline({ values, className, smooth = false }: SparklineProps) {
  const coords = toSparklineCoordinates(values);
  const linePoints = toSparklinePolyline(coords);
  const linePath = smooth ? toSparklineSmoothPath(coords) : "";
  const areaPath = smooth ? `${linePath} L 100 100 L 0 100 Z` : "";

  return (
    <div className={["h-24 w-full", className ?? ""].join(" ")}>
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkline-fill" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(79,122,63,0.28)" />
            <stop offset="100%" stopColor="rgba(79,122,63,0.02)" />
          </linearGradient>
        </defs>
        {smooth ? (
          <>
            <path d={linePath} fill="none" stroke="rgba(79,122,63,0.95)" strokeWidth="3" />
            <path d={areaPath} fill="url(#sparkline-fill)" stroke="none" />
          </>
        ) : (
          <>
            <polyline fill="none" points={linePoints} stroke="rgba(79,122,63,0.95)" strokeWidth="3" />
            <polyline fill="url(#sparkline-fill)" points={`0,100 ${linePoints} 100,100`} stroke="none" />
          </>
        )}
      </svg>
    </div>
  );
});
