import { memo } from "react";

type SparklineProps = {
  values: number[];
  className?: string;
};

function toPoints(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 72 - 14;
      return `${x},${y}`;
    })
    .join(" ");
}

export const Sparkline = memo(function Sparkline({ values, className }: SparklineProps) {
  const points = toPoints(values);

  return (
    <div className={["h-24 w-full", className ?? ""].join(" ")}>
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkline-fill" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(79,122,63,0.28)" />
            <stop offset="100%" stopColor="rgba(79,122,63,0.02)" />
          </linearGradient>
        </defs>
        <polyline fill="none" points={points} stroke="rgba(79,122,63,0.95)" strokeWidth="3" />
        <polyline
          fill="url(#sparkline-fill)"
          points={`0,100 ${points} 100,100`}
          stroke="none"
        />
      </svg>
    </div>
  );
});
