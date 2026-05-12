import { useState } from "react";
import { PanelCard } from "../../components/PanelCard";
import { SectionTitle } from "../../components/SectionTitle";
import { PageScaffold } from "../shared/PageScaffold";

type Range = "day" | "week" | "month" | "total";

// Mock historical data points (hourly for day, daily for week/month)
const mockData: Record<Range, { time: string; generation: number; consumption: number; co2: number }[]> = {
  day: Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    generation: Math.max(0, Math.sin(((i - 6) / 12) * Math.PI) * 500 + Math.random() * 50),
    consumption: 300 + Math.random() * 100,
    co2: Math.max(0, Math.sin(((i - 6) / 12) * Math.PI) * 250 + Math.random() * 25)
  })),
  week: (["一", "二", "三", "四", "五", "六", "日"] as const).map((day, i) => ({
    time: `週${day}`,
    generation: 2000 + Math.random() * 800,
    consumption: 2500 + Math.random() * 500,
    co2: 1000 + Math.random() * 400
  })),
  month: Array.from({ length: 30 }, (_, i) => ({
    time: `${i + 1}日`,
    generation: 2000 + Math.random() * 1000,
    consumption: 2500 + Math.random() * 600,
    co2: 1000 + Math.random() * 500
  })),
  total: Array.from({ length: 12 }, (_, i) => ({
    time: `${i + 1}月`,
    generation: 50000 + Math.random() * 20000,
    consumption: 60000 + Math.random() * 15000,
    co2: 25000 + Math.random() * 10000
  }))
};

function TrendChart({ data, range }: { data: typeof mockData[Range]; range: Range }) {
  const maxVal = Math.max(...data.map(d => d.generation), 1);
  const width = 800;
  const height = 200;
  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding + chartH - (d.generation / maxVal) * chartH;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${padding},${padding + chartH} ${points} ${padding + chartW},${padding + chartH}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          y1={padding + chartH * (1 - ratio)}
          x2={padding + chartW}
          y2={padding + chartH * (1 - ratio)}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="1"
        />
      ))}
      {/* Area fill */}
      <polygon points={areaPoints} fill="rgba(79,122,63,0.15)" />
      {/* Line */}
      <polyline fill="none" points={points} stroke="rgba(79,122,63,0.9)" strokeWidth="2.5" />
      {/* X-axis labels */}
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0).map((d, i) => {
        const idx = data.indexOf(d);
        const x = padding + (idx / Math.max(data.length - 1, 1)) * chartW;
        return (
          <text key={i} x={x} y={height - 5} textAnchor="middle" className="fill-neutral-400" fontSize="10">
            {d.time}
          </text>
        );
      })}
    </svg>
  );
}

export function EnergyTrend() {
  const [range, setRange] = useState<Range>("day");
  const data = mockData[range];
  const totalGen = data.reduce((s, d) => s + d.generation, 0);
  const totalCon = data.reduce((s, d) => s + d.consumption, 0);
  const totalCo2 = data.reduce((s, d) => s + d.co2, 0);

  return (
    <PageScaffold
      path="/trends"
      description="能源趨勢摘要：發電、用電、CO₂ 趨勢圖表。"
    >
      <SectionTitle title="能源趨勢摘要" subtitle="ENERGY TREND SUMMARY" />

      {/* Range selector */}
      <div className="flex gap-3">
        {(["day", "week", "month", "total"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              range === r
                ? "bg-brand-900 text-white"
                : "bg-white/70 text-neutral-600 hover:bg-white"
            }`}
          >
            {{ day: "今日", week: "本週", month: "本月", total: "累計" }[r]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/70 bg-white/85 p-5 text-center shadow-card">
          <p className="text-3xl font-bold text-brand-900">{Math.round(totalGen).toLocaleString()}</p>
          <p className="mt-1 text-sm text-neutral-500">發電量 (kWh)</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/85 p-5 text-center shadow-card">
          <p className="text-3xl font-bold text-blue-700">{Math.round(totalCon).toLocaleString()}</p>
          <p className="mt-1 text-sm text-neutral-500">用電量 (kWh)</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/85 p-5 text-center shadow-card">
          <p className="text-3xl font-bold text-green-700">{Math.round(totalCo2).toLocaleString()}</p>
          <p className="mt-1 text-sm text-neutral-500">CO₂ 減量 (kg)</p>
        </div>
      </div>

      {/* Trend chart */}
      <PanelCard title="發電趨勢" subtitle="GENERATION TREND">
        <TrendChart data={data} range={range} />
      </PanelCard>
    </PageScaffold>
  );
}
