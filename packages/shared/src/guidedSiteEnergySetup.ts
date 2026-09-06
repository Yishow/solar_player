export type SiteEnergySetupStep = "site" | "total" | "departments" | "basis";

export function siteEnergySetupHref(scope: "cl" | "kn") {
  return `/settings/data-hub?scope=${scope}&task=energy`;
}

export function nextSiteEnergySetupStep(step: SiteEnergySetupStep): SiteEnergySetupStep {
  const order: SiteEnergySetupStep[] = ["site", "total", "departments", "basis"];
  return order[Math.min(order.indexOf(step) + 1, order.length - 1)]!;
}
