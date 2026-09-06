export type OnboardingStep = "connection" | "site" | "received-data" | "confirm";

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep {
  const order: OnboardingStep[] = ["connection", "site", "received-data", "confirm"];
  return order[Math.min(order.indexOf(step) + 1, order.length - 1)]!;
}

export function onboardingPreservesScope(scope: "cl" | "kn") {
  return scope;
}
