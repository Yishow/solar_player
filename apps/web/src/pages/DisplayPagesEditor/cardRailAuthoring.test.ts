import assert from "node:assert/strict";
import test from "node:test";
import { createSustainabilityDisplayPageSeedConfig } from "../Sustainability/displayPageConfig";
import { applyDraftConfigUpdate, createDraftSession } from "../../hooks/displayPageDraftSession";
import {
  addCardRailCard,
  duplicateCardRailCard,
  moveCardRailCard,
  removeCardRailCard,
  switchCardRailCardTemplate,
  toggleCardRailCardVisibility
} from "./cardRailAuthoring";

const highlightRailPath: Array<number | string> = ["highlightRail"];

test("duplicate and reorder card rail cards inside the active draft session", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig();
  const session = createDraftSession(seedConfig, null, {
    emptyContent: "show-placeholder",
    missingAsset: "show-seed",
    staleData: "show-placeholder"
  });

  const duplicated = applyDraftConfigUpdate(session, (current) =>
    duplicateCardRailCard(current, highlightRailPath, "household-cumulative")
  );
  const reordered = applyDraftConfigUpdate(duplicated, (current) =>
    moveCardRailCard(current, highlightRailPath, "household-cumulative-copy-1", "earlier")
  );

  assert.deepEqual(
    reordered.config.highlightRail.cards.map((card) => ({
      displayOrder: card.displayOrder,
      id: card.id
    })),
    [
      { displayOrder: 1, id: "household-today" },
      { displayOrder: 2, id: "household-cumulative-copy-1" },
      { displayOrder: 3, id: "household-cumulative" }
    ]
  );
  assert.equal(reordered.history.past.length >= 2, true);
});

test("card rail lifecycle helpers add, switch, hide, and remove cards with typed payloads", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig();

  const withAddedCard = addCardRailCard(seedConfig, highlightRailPath, "metric-highlight");
  const addedCard = withAddedCard.highlightRail.cards.at(-1);
  assert.ok(addedCard);
  assert.equal(addedCard?.template, "metric-highlight");

  const withTemplateSwitch = switchCardRailCardTemplate(
    withAddedCard,
    highlightRailPath,
    addedCard!.id,
    "household-equivalent"
  );
  const switchedCard = withTemplateSwitch.highlightRail.cards.find((card) => card.id === addedCard!.id);
  assert.equal(switchedCard?.template, "household-equivalent");
  assert.equal(switchedCard?.contentSource.payload.eyebrow, "今日綠電效益");

  const withHiddenCard = toggleCardRailCardVisibility(
    withTemplateSwitch,
    highlightRailPath,
    addedCard!.id
  );
  const hiddenCard = withHiddenCard.highlightRail.cards.find((card) => card.id === addedCard!.id);
  assert.equal(hiddenCard?.visible, false);

  const withRemovedCard = removeCardRailCard(withHiddenCard, highlightRailPath, addedCard!.id);
  assert.equal(
    withRemovedCard.highlightRail.cards.some((card) => card.id === addedCard!.id),
    false
  );
});
