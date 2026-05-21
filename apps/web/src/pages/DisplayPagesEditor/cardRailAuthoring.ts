import type { DisplayEditorPath } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  createMetricHighlightCard,
  createUnavailableHouseholdEquivalenceCard,
  isDisplayPageCardRail,
  sortDisplayPageCardRailCards,
  type DisplayPageCardRail,
  type DisplayPageCardRailCard,
  type DisplayPageCardRailTemplateKey
} from "@solar-display/shared";
import { getValueAtPath, setValueAtPath } from "../../hooks/displayPageConfigPaths";

function cloneCard<TCard extends DisplayPageCardRailCard>(card: TCard): TCard {
  return structuredClone(card);
}

function normalizeCards(cards: DisplayPageCardRailCard[]) {
  return cards.map((card, index) => ({
    ...card,
    displayOrder: index + 1
  }));
}

function resolveCardRail<T extends Record<string, unknown>>(config: T, railPath: DisplayEditorPath) {
  const rail = getValueAtPath(config, railPath);
  return isDisplayPageCardRail(rail) ? rail : null;
}

function resolveUniqueCardId(cards: DisplayPageCardRailCard[], baseId: string) {
  const normalizedBaseId = baseId.replace(/-copy-\d+$/, "");
  const existingIds = new Set(cards.map((card) => card.id));
  if (!existingIds.has(normalizedBaseId)) {
    return normalizedBaseId;
  }

  let copyIndex = 1;
  let candidate = `${normalizedBaseId}-copy-${copyIndex}`;
  while (existingIds.has(candidate)) {
    copyIndex += 1;
    candidate = `${normalizedBaseId}-copy-${copyIndex}`;
  }

  return candidate;
}

function inferHouseholdCardKey(card: DisplayPageCardRailCard) {
  if (card.id.includes("cumulative")) {
    return "cumulative" as const;
  }
  if (card.template === "household-equivalent" && card.contentSource.payload.basisSourceLabel.includes("累積")) {
    return "cumulative" as const;
  }
  return "today" as const;
}

function createCardForTemplate(args: {
  cards: DisplayPageCardRailCard[];
  container: DisplayPageCardRail["container"];
  frame?: DisplayPageCardRailCard["frame"];
  idBase: string;
  template: DisplayPageCardRailTemplateKey;
}) {
  const frame =
    args.frame ??
    args.cards.at(-1)?.frame ?? {
      height: Math.min(args.container.height, 108),
      left: 0,
      top: 0,
      width: Math.min(args.container.width, 229)
    };
  const id = resolveUniqueCardId(args.cards, args.idBase);
  const displayOrder = args.cards.length + 1;

  if (args.template === "household-equivalent") {
    return {
      contentSource: {
        mode: "static" as const,
        payload: createUnavailableHouseholdEquivalenceCard("today")
      },
      displayOrder,
      frame: structuredClone(frame),
      id,
      stylePreset: null,
      template: "household-equivalent" as const,
      visible: true
    };
  }

  return createMetricHighlightCard({
    displayOrder,
    frame,
    id,
    label: "新增指標",
    unit: "kWh",
    value: "--"
  });
}

function updateRail<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  updater: (rail: DisplayPageCardRail) => DisplayPageCardRail
) {
  const rail = resolveCardRail(config, railPath);
  if (!rail) {
    return config;
  }

  return setValueAtPath(config, railPath, updater(rail));
}

export function addCardRailCard<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  template: DisplayPageCardRailTemplateKey
) {
  return updateRail(config, railPath, (rail) => ({
    ...rail,
    cards: normalizeCards([
      ...rail.cards,
      createCardForTemplate({
        cards: rail.cards,
        container: rail.container,
        idBase: template,
        template
      })
    ])
  }));
}

export function duplicateCardRailCard<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  cardId: string
) {
  return updateRail(config, railPath, (rail) => {
    const sourceCard = rail.cards.find((card) => card.id === cardId);
    if (!sourceCard) {
      return rail;
    }

    const duplicate = cloneCard(sourceCard);
    duplicate.id = resolveUniqueCardId(rail.cards, sourceCard.id);
    duplicate.displayOrder = rail.cards.length + 1;

    return {
      ...rail,
      cards: normalizeCards([...rail.cards, duplicate])
    };
  });
}

export function moveCardRailCard<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  cardId: string,
  direction: "earlier" | "later"
) {
  return updateRail(config, railPath, (rail) => {
    const orderedCards = sortDisplayPageCardRailCards(rail.cards);
    const index = orderedCards.findIndex((card) => card.id === cardId);
    const targetIndex = direction === "earlier" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= orderedCards.length) {
      return rail;
    }

    const nextCards = orderedCards.slice();
    const [movedCard] = nextCards.splice(index, 1);
    nextCards.splice(targetIndex, 0, movedCard!);

    return {
      ...rail,
      cards: normalizeCards(nextCards)
    };
  });
}

export function removeCardRailCard<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  cardId: string
) {
  return updateRail(config, railPath, (rail) => ({
    ...rail,
    cards: normalizeCards(rail.cards.filter((card) => card.id !== cardId))
  }));
}

export function toggleCardRailCardVisibility<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  cardId: string
) {
  return updateRail(config, railPath, (rail) => ({
    ...rail,
    cards: rail.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            visible: !card.visible
          }
        : card
    )
  }));
}

export function switchCardRailCardTemplate<T extends Record<string, unknown>>(
  config: T,
  railPath: DisplayEditorPath,
  cardId: string,
  template: DisplayPageCardRailTemplateKey
) {
  return updateRail(config, railPath, (rail) => ({
    ...rail,
    cards: rail.cards.map((card) => {
      if (card.id !== cardId || card.template === template) {
        return card;
      }

      if (template === "household-equivalent") {
        return {
          contentSource: {
            mode: "static" as const,
            payload: createUnavailableHouseholdEquivalenceCard(inferHouseholdCardKey(card))
          },
          displayOrder: card.displayOrder,
          frame: structuredClone(card.frame),
          id: card.id,
          stylePreset: card.stylePreset ?? null,
          template,
          visible: card.visible
        };
      }

      return {
        ...createMetricHighlightCard({
          displayOrder: card.displayOrder,
          frame: structuredClone(card.frame),
          id: card.id,
          label: card.template === "metric-highlight" ? card.contentSource.payload.label : "新增指標",
          unit: card.template === "metric-highlight" ? card.contentSource.payload.unit : "kWh",
          value: card.template === "metric-highlight" ? card.contentSource.payload.value : "--",
          visible: card.visible
        }),
        stylePreset: card.stylePreset ?? null
      };
    })
  }));
}
