import type { MetricScope } from "@solar-display/shared";

export type FactoryTopicSite = "jungli" | "guanyin";

export const factoryTopicSiteOptions: Array<{ label: string; value: FactoryTopicSite }> = [
  { label: "中壢廠", value: "jungli" },
  { label: "觀音廠", value: "guanyin" }
];

const semanticFactoryTopicMetricKeys = [
  "factoryCircuit.stampingPower",
  "factoryCircuit.bodyPower",
  "factoryCircuit.paintingPower",
  "factoryCircuit.assemblyPower",
  "factoryCircuit.utilityPower",
  "factoryCircuit.officePower",
  "factoryCircuit.heavyVehiclePower",
  "factoryCircuit.edCoatingPower"
] as const;

export const jungliFactoryTopicMetricKeys = semanticFactoryTopicMetricKeys;
export const guanyinFactoryTopicMetricKeys = semanticFactoryTopicMetricKeys;

const semanticFactoryTopicMetricKeySet = new Set<string>(semanticFactoryTopicMetricKeys);

export const factoryTopicMetricKeysBySite: Record<FactoryTopicSite, readonly string[]> = {
  guanyin: guanyinFactoryTopicMetricKeys,
  jungli: jungliFactoryTopicMetricKeys
};

export function resolveFactoryTopicMetricSite(
  metricKey: string,
  metricScope: MetricScope
): FactoryTopicSite | "hidden" | null {
  if (!semanticFactoryTopicMetricKeySet.has(metricKey)) {
    return null;
  }
  if (metricScope === "cl") {
    return "jungli";
  }
  if (metricScope === "kn") {
    return "guanyin";
  }
  return "hidden";
}

export function isTopicMetricVisibleForFactorySite(
  metricKey: string,
  metricScope: MetricScope,
  site: FactoryTopicSite
) {
  const metricSite = resolveFactoryTopicMetricSite(metricKey, metricScope);
  return metricSite === null || metricSite === site;
}
