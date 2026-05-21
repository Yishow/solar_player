import type { HouseholdEquivalenceCard } from "./householdEquivalence.js";
import type { SustainabilityProvenance } from "./sustainabilityStory.js";
import { cloneValue } from "./cloneValue.js";

export const displayPageCardRailTemplateKeys = [
  "metric-highlight",
  "household-equivalent"
] as const;

export type DisplayPageCardRailTemplateKey = (typeof displayPageCardRailTemplateKeys)[number];

export type DisplayPageCardRailFrame = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type DisplayPageMetricHighlightCardPayload = {
  label: string;
  provenance?: Partial<SustainabilityProvenance> | null;
  unit: string;
  value: string;
};

export type DisplayPageHouseholdEquivalentCardPayload = HouseholdEquivalenceCard;

export type DisplayPageCardRailStaticContentSource<TPayload> = {
  mode: "static";
  payload: TPayload;
};

type DisplayPageCardRailCardBase = {
  displayOrder: number;
  frame: DisplayPageCardRailFrame;
  id: string;
  stylePreset?: string | null;
  visible: boolean;
};

export type DisplayPageMetricHighlightCard = DisplayPageCardRailCardBase & {
  contentSource: DisplayPageCardRailStaticContentSource<DisplayPageMetricHighlightCardPayload>;
  template: "metric-highlight";
};

export type DisplayPageHouseholdEquivalentCard = DisplayPageCardRailCardBase & {
  contentSource: DisplayPageCardRailStaticContentSource<DisplayPageHouseholdEquivalentCardPayload>;
  template: "household-equivalent";
};

export type DisplayPageCardRailCard =
  | DisplayPageHouseholdEquivalentCard
  | DisplayPageMetricHighlightCard;

export type DisplayPageCardRail = {
  cards: DisplayPageCardRailCard[];
  container: DisplayPageCardRailFrame;
};

export type LegacyDisplayPageMetricHighlightRail = {
  container: DisplayPageCardRailFrame;
  items: DisplayPageMetricHighlightCardPayload[];
};

export function isDisplayPageCardRailTemplateKey(
  value: unknown
): value is DisplayPageCardRailTemplateKey {
  return (
    typeof value === "string" &&
    (displayPageCardRailTemplateKeys as readonly string[]).includes(value)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDisplayPageCardRailFrame(value: unknown): value is DisplayPageCardRailFrame {
  if (!isPlainObject(value)) {
    return false;
  }

  return ["height", "left", "top", "width"].every(
    (key) => typeof value[key] === "number" && Number.isFinite(value[key] as number)
  );
}

function isMetricHighlightPayload(value: unknown): value is DisplayPageMetricHighlightCardPayload {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.label === "string" &&
    typeof value.unit === "string" &&
    typeof value.value === "string"
  );
}

function buildFallbackMetricHighlightFrame(
  container: DisplayPageCardRailFrame,
  index: number,
  count: number
): DisplayPageCardRailFrame {
  const gap = 12;
  const safeCount = Math.max(count, 1);
  const width = Math.max(1, Math.floor((container.width - gap * Math.max(safeCount - 1, 0)) / safeCount));

  return {
    height: container.height,
    left: index * (width + gap),
    top: 0,
    width
  };
}

export function createMetricHighlightCard(args: {
  displayOrder: number;
  frame: DisplayPageCardRailFrame;
  id: string;
  label: string;
  unit: string;
  value: string;
  visible?: boolean;
}) {
  return {
    contentSource: {
      mode: "static",
      payload: {
        label: args.label,
        unit: args.unit,
        value: args.value
      }
    },
    displayOrder: args.displayOrder,
    frame: cloneValue(args.frame),
    id: args.id,
    stylePreset: null,
    template: "metric-highlight",
    visible: args.visible ?? true
  } satisfies DisplayPageMetricHighlightCard;
}

export function isDisplayPageCardRail(value: unknown): value is DisplayPageCardRail {
  if (!isPlainObject(value) || !isDisplayPageCardRailFrame(value.container) || !Array.isArray(value.cards)) {
    return false;
  }

  return value.cards.every(
    (card) =>
      isPlainObject(card) &&
      typeof card.id === "string" &&
      typeof card.template === "string" &&
      typeof card.visible === "boolean" &&
      typeof card.displayOrder === "number" &&
      isDisplayPageCardRailFrame(card.frame) &&
      isPlainObject(card.contentSource) &&
      card.contentSource.mode === "static"
  );
}

export function isLegacyDisplayPageMetricHighlightRail(
  value: unknown
): value is LegacyDisplayPageMetricHighlightRail {
  if (!isPlainObject(value) || !isDisplayPageCardRailFrame(value.container) || !Array.isArray(value.items)) {
    return false;
  }

  return value.items.every(isMetricHighlightPayload);
}

export function sortDisplayPageCardRailCards<TCard extends DisplayPageCardRailCard>(cards: TCard[]) {
  return [...cards].sort((left, right) => left.displayOrder - right.displayOrder);
}

export function upgradeLegacyMetricHighlightRail(
  legacyRail: LegacyDisplayPageMetricHighlightRail,
  fallbackCards: DisplayPageCardRailCard[] = []
): DisplayPageCardRail {
  const metricFallbackCards = fallbackCards.filter(
    (card): card is DisplayPageMetricHighlightCard => card.template === "metric-highlight"
  );

  return {
    cards: legacyRail.items.map((item, index) => {
      const fallbackCard = metricFallbackCards[index];

      return {
        contentSource: {
          mode: "static",
          payload: cloneValue(item)
        },
        displayOrder: fallbackCard?.displayOrder ?? index + 1,
        frame:
          fallbackCard?.frame
            ? cloneValue(fallbackCard.frame)
            : buildFallbackMetricHighlightFrame(legacyRail.container, index, legacyRail.items.length),
        id: fallbackCard?.id ?? `summary-${index + 1}`,
        stylePreset: fallbackCard?.stylePreset ?? null,
        template: "metric-highlight",
        visible: fallbackCard?.visible ?? true
      } satisfies DisplayPageMetricHighlightCard;
    }),
    container: cloneValue(legacyRail.container)
  };
}
