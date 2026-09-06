export type SiteEnergySetupStep = "site" | "total" | "departments" | "basis";

const ORDER: readonly SiteEnergySetupStep[] = ["site", "total", "departments", "basis"];

export function siteEnergySetupHref(scope: "cl" | "kn") {
  return `/settings/data-hub?scope=${scope}&task=energy`;
}

export function isSiteEnergySetupTask(task: string | null | undefined) {
  return task === "energy";
}

export function siteEnergySetupChooseSiteCopy() {
  return "請先選擇 CL 或 KN 廠區，才能開始廠區用電設定。";
}

export function nextSiteEnergySetupStep(step: SiteEnergySetupStep): SiteEnergySetupStep {
  return ORDER[Math.min(ORDER.indexOf(step) + 1, ORDER.length - 1)]!;
}

export function previousSiteEnergySetupStep(step: SiteEnergySetupStep): SiteEnergySetupStep {
  return ORDER[Math.max(ORDER.indexOf(step) - 1, 0)]!;
}

export function siteEnergySetupStepIndex(step: SiteEnergySetupStep) {
  return ORDER.indexOf(step);
}

export function currentProfileMonthSelection(siteTimeZone: string, asOf = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: siteTimeZone,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date(asOf));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { kind: "month" as const, month, year };
}
