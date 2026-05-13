export type LiveMetric = {
  label: string;
  value: string;
  unit: string;
  icon: string;
  helper: string;
};

export const liveMetrics: LiveMetric[] = [
  {
    label: "即時功率",
    value: "586",
    unit: "kW",
    icon: "⚡",
    helper: "較昨日同期 +8.4%"
  },
  {
    label: "今日發電",
    value: "2,340",
    unit: "kWh",
    icon: "☀️",
    helper: "今日目標達成 78%"
  },
  {
    label: "自用率",
    value: "71",
    unit: "%",
    icon: "🏭",
    helper: "工廠優先自用"
  },
  {
    label: "碳減量",
    value: "1.24",
    unit: "tCO₂e",
    icon: "🌿",
    helper: "本日累積"
  },
  {
    label: "設備可用率",
    value: "98.6",
    unit: "%",
    icon: "🛰️",
    helper: "14 台逆變器在線"
  }
];

export const trendSeries = [46, 52, 49, 58, 61, 64, 60, 68, 73, 70, 78, 82];

export const deviceMetrics = [
  { label: "CPU 使用率", value: "32", unit: "%" },
  { label: "記憶體", value: "4.6 / 8.0", unit: "GB" },
  { label: "儲存空間", value: "412", unit: "GB" },
  { label: "網路延遲", value: "18", unit: "ms" }
];
