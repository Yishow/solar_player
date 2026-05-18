import { overviewHeroLayout, overviewKpiLayout } from "./layout";

export type OverviewDisplayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type OverviewDisplayTextRect = {
  left: number;
  top: number;
  width: number;
};

export type OverviewDisplayPageConfig = {
  heroContainer: OverviewDisplayRect;
  heroCopy: {
    eyebrow: string;
    subtitleLines: [string, string];
    titleLines: [string, string];
  };
  heroCopyLayout: OverviewDisplayTextRect;
  heroMedia: {
    alt: string;
    src: string;
  };
  kpiCards: Record<"co2Today" | "co2Total" | "power" | "today" | "total", OverviewDisplayRect>;
};

export function createOverviewDisplayPageSeedConfig(
  heroSrc = "/brand-logo.png",
  heroAlt = "國瑞汽車中廠綠能展示場域"
): OverviewDisplayPageConfig {
  return {
    heroContainer: {
      ...overviewHeroLayout
    },
    heroCopy: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["Driving a Better Future with", "Green Manufacturing"],
      titleLines: ["以綠色製造", "驅動美好生活"]
    },
    heroCopyLayout: {
      left: 86,
      top: 172,
      width: 642
    },
    heroMedia: {
      alt: heroAlt,
      src: heroSrc
    },
    kpiCards: {
      co2Today: { ...overviewKpiLayout.co2Today },
      co2Total: { ...overviewKpiLayout.co2Total },
      power: { ...overviewKpiLayout.power },
      today: { ...overviewKpiLayout.today },
      total: { ...overviewKpiLayout.total }
    }
  };
}
