import type {
  DisplayPageCardRail,
  DisplayPageCardRailCard,
  DisplayPageCardRailTemplateKey
} from "@solar-display/shared";
import { sortDisplayPageCardRailCards } from "@solar-display/shared";

type CardRailTemplateResolvers<TContext, TResult> = {
  [K in DisplayPageCardRailTemplateKey]?: (
    card: Extract<DisplayPageCardRailCard, { template: K }>,
    context: TContext
  ) => TResult | null;
};

export function resolveDisplayPageCardRailCards<TContext, TResult>(
  rail: DisplayPageCardRail,
  context: TContext,
  resolvers: CardRailTemplateResolvers<TContext, TResult>
) {
  const results: TResult[] = [];

  for (const card of sortDisplayPageCardRailCards(rail.cards)) {
    if (!card.visible) {
      continue;
    }

    const resolver = resolvers[card.template] as
      | ((card: DisplayPageCardRailCard, context: TContext) => TResult | null)
      | undefined;

    if (!resolver) {
      continue;
    }

    const resolved = resolver(card, context);
    if (resolved !== null) {
      results.push(resolved);
    }
  }

  return results;
}
