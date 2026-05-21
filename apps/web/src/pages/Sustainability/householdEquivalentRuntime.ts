import type { DisplayPageHouseholdEquivalentCard } from "@solar-display/shared";
import type { buildSustainabilityViewModel } from "./viewModel";

export function resolveHouseholdEquivalentRuntimePayload(
  card: DisplayPageHouseholdEquivalentCard,
  householdEquivalents: ReturnType<typeof buildSustainabilityViewModel>["householdEquivalents"]
) {
  const provenanceSource = card.contentSource.payload.provenance?.source;
  if (provenanceSource === "daily-self-consumption") {
    return householdEquivalents.today;
  }
  if (provenanceSource === "cumulative-self-consumption") {
    return householdEquivalents.cumulative;
  }

  const basisSourceLabel = card.contentSource.payload.basisSourceLabel;
  if (basisSourceLabel.includes("今日")) {
    return householdEquivalents.today;
  }
  if (basisSourceLabel.includes("累積")) {
    return householdEquivalents.cumulative;
  }

  if (card.id.includes("household-today")) {
    return householdEquivalents.today;
  }
  if (card.id.includes("household-cumulative")) {
    return householdEquivalents.cumulative;
  }

  return card.contentSource.payload;
}
