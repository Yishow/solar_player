import { solarKpiLayout } from "../Solar/layout";

export const overviewTitleLayout = {
  left: 86,
  top: 172,
  width: 642
} as const;

export const overviewHeroLayout = {
  height: 820,
  left: 540,
  top: 140,
  width: 1340
} as const;

export const overviewLeafLayout = {
  height: 168,
  left: 420,
  top: 528,
  width: 296
} as const;

export const overviewGoldLineLayout = {
  left: 12,
  top: 610,
  width: 760
} as const;

export const overviewSummaryLayout = {
  left: 88,
  top: 602,
  width: 376
} as const;

export const overviewKpiLayout = {
  co2Today: solarKpiLayout.totalCo2,
  co2Total: solarKpiLayout.efficiency,
  power: solarKpiLayout.generation,
  today: solarKpiLayout.selfConsumption,
  total: solarKpiLayout.co2
} as const;

export const overviewAssetMap = {
  hero: {
    assetId: "overview-hero-ref",
    src: "docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/overview-hero-ref.jpg"
  }
} as const;
