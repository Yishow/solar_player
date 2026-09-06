export type OnboardingStep = "connection" | "site" | "received-data" | "confirm";

const ORDER: readonly OnboardingStep[] = ["connection", "site", "received-data", "confirm"];

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep {
  return ORDER[Math.min(ORDER.indexOf(step) + 1, ORDER.length - 1)]!;
}

export function previousOnboardingStep(step: OnboardingStep): OnboardingStep {
  return ORDER[Math.max(ORDER.indexOf(step) - 1, 0)]!;
}

export function onboardingPreservesScope(scope: "cl" | "kn") {
  return scope;
}

export function isOnboardingTask(task: string | null | undefined) {
  return task === "connect";
}
