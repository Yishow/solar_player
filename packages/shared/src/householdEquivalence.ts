import type { SustainabilityProvenance } from "./sustainabilityStory.js";

export const householdEquivalenceCardKeys = ["today", "cumulative"] as const;

export type HouseholdEquivalenceCardKey = (typeof householdEquivalenceCardKeys)[number];

export type HouseholdEquivalenceCalcProfile = {
  averageDailyUsageKwh: number;
  averageMonthlyUsageKwh: number;
  disclaimer: string;
  estimatedTariffPerKwh: number;
  householdLabel: string;
  id: string;
  label: string;
};

export type HouseholdEquivalenceCardInput = {
  basisSourceLabel?: string;
  calcProfile?: Partial<HouseholdEquivalenceCalcProfile> | null;
  derivedStatus?: "available" | "unavailable";
  disclaimer?: string;
  eyebrow?: string;
  fallbackReason?: string | null;
  householdCountDisplay?: string;
  householdLabel?: string;
  provenance?: Partial<SustainabilityProvenance> | null;
  supportingLine?: string;
};

export type HouseholdEquivalenceCard = {
  basisSourceLabel: string;
  calcProfile: HouseholdEquivalenceCalcProfile | null;
  derivedStatus: "available" | "unavailable";
  disclaimer: string;
  eyebrow: string;
  fallbackReason: string | null;
  householdCountDisplay: string;
  householdLabel: string;
  provenance: SustainabilityProvenance;
  supportingLine: string;
};

function buildMissingProvenance(label: string) {
  return {
    label,
    source: "aggregate-missing",
    sourceClass: "missing",
    syncState: "missing",
    updatedAt: null
  } satisfies SustainabilityProvenance;
}

function resolveCardCopy(cardKey: HouseholdEquivalenceCardKey) {
  if (cardKey === "today") {
    return {
      basisSourceLabel: "今日自發自用量",
      eyebrow: "今日綠電效益",
      supportingLine: "約可折抵一日電費"
    };
  }

  return {
    basisSourceLabel: "累積自發自用量",
    eyebrow: "累積綠能成果",
    supportingLine: "約相當於一個月電費"
  };
}

function resolveCalcProfile(
  calcProfile?: Partial<HouseholdEquivalenceCalcProfile> | null
) {
  const defaults = createDefaultHouseholdEquivalenceCalcProfile();

  return {
    ...defaults,
    ...(calcProfile ?? {})
  } satisfies HouseholdEquivalenceCalcProfile;
}

function roundHouseholdCount(value: number) {
  return Math.max(Math.round(value), 0).toLocaleString("zh-TW");
}

export function createDefaultHouseholdEquivalenceCalcProfile(): HouseholdEquivalenceCalcProfile {
  return {
    averageDailyUsageKwh: 4,
    averageMonthlyUsageKwh: 120,
    disclaimer: "依四口之家平均用電與估算電價換算",
    estimatedTariffPerKwh: 5,
    householdLabel: "戶4口之家",
    id: "default-four-person",
    label: "預設四口之家"
  };
}

export function createUnavailableHouseholdEquivalenceCard(
  cardKey: HouseholdEquivalenceCardKey,
  input: HouseholdEquivalenceCardInput = {}
) {
  const copy = resolveCardCopy(cardKey);
  const calcProfile = resolveCalcProfile(input.calcProfile);

  return {
    basisSourceLabel: input.basisSourceLabel ?? copy.basisSourceLabel,
    calcProfile,
    derivedStatus: "unavailable",
    disclaimer: input.disclaimer ?? calcProfile.disclaimer,
    eyebrow: input.eyebrow ?? copy.eyebrow,
    fallbackReason: input.fallbackReason ?? "equivalence-basis-missing",
    householdCountDisplay: input.householdCountDisplay ?? "--",
    householdLabel: input.householdLabel ?? calcProfile.householdLabel,
    provenance: {
      ...buildMissingProvenance(input.basisSourceLabel ?? copy.basisSourceLabel),
      ...input.provenance
    },
    supportingLine: input.supportingLine ?? "資料不足，暫時無法換算"
  } satisfies HouseholdEquivalenceCard;
}

export function deriveHouseholdEquivalenceCard(args: {
  basisSourceLabel?: string;
  cardKey: HouseholdEquivalenceCardKey;
  calcProfile?: Partial<HouseholdEquivalenceCalcProfile> | null;
  provenance?: Partial<SustainabilityProvenance> | null;
  selfConsumptionKwh: number | null;
}) {
  const calcProfile = resolveCalcProfile(args.calcProfile);
  const copy = resolveCardCopy(args.cardKey);
  const basisUsage =
    args.cardKey === "today"
      ? calcProfile.averageDailyUsageKwh
      : calcProfile.averageMonthlyUsageKwh;

  if (
    args.selfConsumptionKwh === null ||
    !Number.isFinite(args.selfConsumptionKwh) ||
    args.selfConsumptionKwh < 0 ||
    !Number.isFinite(basisUsage) ||
    basisUsage <= 0
  ) {
    return createUnavailableHouseholdEquivalenceCard(args.cardKey, {
      basisSourceLabel: args.basisSourceLabel,
      calcProfile,
      provenance: args.provenance
    });
  }

  const householdCountDisplay = roundHouseholdCount(args.selfConsumptionKwh / basisUsage);

  return {
    basisSourceLabel: args.basisSourceLabel ?? copy.basisSourceLabel,
    calcProfile,
    derivedStatus: "available",
    disclaimer: calcProfile.disclaimer,
    eyebrow: copy.eyebrow,
    fallbackReason: null,
    householdCountDisplay,
    householdLabel: calcProfile.householdLabel,
    provenance: {
      label: args.basisSourceLabel ?? copy.basisSourceLabel,
      source: args.cardKey === "today" ? "daily-self-consumption" : "cumulative-self-consumption",
      sourceClass: "derived-metric",
      syncState: "fresh",
      updatedAt: null,
      ...args.provenance
    },
    supportingLine: copy.supportingLine
  } satisfies HouseholdEquivalenceCard;
}
