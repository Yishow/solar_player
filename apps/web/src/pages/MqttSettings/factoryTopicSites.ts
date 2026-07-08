export type FactoryTopicSite = "jungli" | "guanyin";

export const factoryTopicSiteOptions: Array<{ label: string; value: FactoryTopicSite }> = [
  { label: "中壢廠", value: "jungli" },
  { label: "觀音廠", value: "guanyin" }
];

export const jungliFactoryTopicMetricKeys = [
  "factoryStampingPower",
  "factoryBodyPower",
  "factoryPaintingPower",
  "factoryAssemblyPower",
  "factoryUtilityPower",
  "factoryOfficePower"
] as const;

export const guanyinFactoryTopicMetricKeys = [
  "factoryCircuit.guanyin.stampingPower",
  "factoryCircuit.guanyin.bodyPower",
  "factoryCircuit.guanyin.paintingPower",
  "factoryCircuit.guanyin.assemblyPower",
  "factoryCircuit.guanyin.utilityPower",
  "factoryCircuit.guanyin.officePower",
  "factoryCircuit.guanyin.heavyVehiclePower",
  "factoryCircuit.guanyin.edCoatingPower"
] as const;

const hiddenLegacyFactoryTopicMetricKeys = [
  "factoryHeavyVehiclePower",
  "factoryEdCoatingPower"
] as const;

const jungliFactoryTopicMetricKeySet = new Set<string>(jungliFactoryTopicMetricKeys);
const guanyinFactoryTopicMetricKeySet = new Set<string>(guanyinFactoryTopicMetricKeys);
const hiddenLegacyFactoryTopicMetricKeySet = new Set<string>(hiddenLegacyFactoryTopicMetricKeys);

export const factoryTopicMetricKeysBySite: Record<FactoryTopicSite, readonly string[]> = {
  guanyin: guanyinFactoryTopicMetricKeys,
  jungli: jungliFactoryTopicMetricKeys
};

export function resolveFactoryTopicMetricSite(metricKey: string): FactoryTopicSite | "hidden" | null {
  if (jungliFactoryTopicMetricKeySet.has(metricKey)) {
    return "jungli";
  }

  if (guanyinFactoryTopicMetricKeySet.has(metricKey)) {
    return "guanyin";
  }

  if (hiddenLegacyFactoryTopicMetricKeySet.has(metricKey)) {
    return "hidden";
  }

  return null;
}

export function isTopicMetricVisibleForFactorySite(metricKey: string, site: FactoryTopicSite) {
  const metricSite = resolveFactoryTopicMetricSite(metricKey);
  return metricSite === null || metricSite === site;
}
