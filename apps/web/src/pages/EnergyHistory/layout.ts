// FHD content-area layout (1920 × 838) for the energy history page.
// Adds an explicit page title row, then a left range rail, top metric cards,
// main chart panel and a bottom summary band — all non-overlapping.
//
// Vertical budget:
//   12-58     title (h ≈ 46)
//   72-786    side range rail (h=714)
//   72-258    5 metric cards (h=186)
//   276-616   chart panel (h=340)
//   632-786   bottom summary band (h=154)

export const energyHistoryLayout = {
  bottom: { height: 154, left: 350, top: 632, width: 1530 },
  chart: { height: 340, left: 350, top: 276, width: 1530 },
  metric: {
    card1: { height: 186, left: 350, top: 72, width: 292 },
    card2: { height: 186, left: 662, top: 72, width: 292 },
    card3: { height: 186, left: 974, top: 72, width: 292 },
    card4: { height: 186, left: 1286, top: 72, width: 292 },
    card5: { height: 186, left: 1598, top: 72, width: 272 }
  },
  side: { height: 714, left: 30, top: 72, width: 290 },
  title: { left: 58, top: 12 }
} as const;

export const energyHistoryMetricCardKeys = ["card1", "card2", "card3", "card4", "card5"] as const;
