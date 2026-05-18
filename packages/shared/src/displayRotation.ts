import type { PlaybackPage } from "./types.js";

export type DisplayRotationPlanEntry = PlaybackPage;

export type DisplayRotationPlan = {
  pages: DisplayRotationPlanEntry[];
};

export function sortDisplayRotationPlanEntries(pages: DisplayRotationPlanEntry[]) {
  return [...pages].sort((left, right) => {
    if (left.displayOrder === right.displayOrder) {
      return left.id - right.id;
    }

    return left.displayOrder - right.displayOrder;
  });
}

export function buildDisplayRotationPlan(pages: DisplayRotationPlanEntry[]): DisplayRotationPlan {
  return {
    pages: sortDisplayRotationPlanEntries(pages)
  };
}
