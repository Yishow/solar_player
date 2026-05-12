export type ImageMock = {
  id: string;
  title: string;
  area: string;
  updatedAt: string;
  durationSec: number;
  resolution: string;
};

export const imageMocks: ImageMock[] = [
  {
    id: "IMG-001",
    title: "太陽能板鳥瞰",
    area: "首頁 Hero",
    updatedAt: "2026/05/10 14:32",
    durationSec: 12,
    resolution: "3840x2160"
  },
  {
    id: "IMG-002",
    title: "工廠迴路導覽",
    area: "迴路頁",
    updatedAt: "2026/05/10 09:18",
    durationSec: 10,
    resolution: "1920x1080"
  },
  {
    id: "IMG-003",
    title: "綠能成果牆",
    area: "永續頁",
    updatedAt: "2026/05/09 17:44",
    durationSec: 15,
    resolution: "1920x1080"
  },
  {
    id: "IMG-004",
    title: "雨天備援畫面",
    area: "離線提示",
    updatedAt: "2026/05/08 08:03",
    durationSec: 8,
    resolution: "1920x1080"
  },
  {
    id: "IMG-005",
    title: "ESG 指標視覺",
    area: "趨勢頁",
    updatedAt: "2026/05/07 19:25",
    durationSec: 10,
    resolution: "2560x1440"
  }
];
