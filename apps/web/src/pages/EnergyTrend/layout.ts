// FHD content-area layout (1920 × 838) for the energy trend summary page.
// Restructured so the hero title sits cleanly on the left, refresh status pill
// on the top-right, range tabs below, and 5 trend cards across the lower half.
//
// Vertical budget:
//   24-110    title block (h1 60px + p 22px subtitle)
//   136-176   copy line
//   18-72     refresh status (top right)
//   88-148    range tabs row (right)
//   60-248    leaf watermark (decorative, behind copy)
//   270-738   5 trend cards (h=468)

export const energyTrendLayout = {
  cards: {
    card1: { height: 468, left: 52, top: 270, width: 304 },
    card2: { height: 468, left: 368, top: 270, width: 304 },
    card3: { height: 468, left: 684, top: 270, width: 304 },
    card4: { height: 468, left: 1000, top: 270, width: 304 },
    card5: { height: 468, left: 1316, top: 270, width: 304 }
  },
  copy: { left: 58, top: 136, width: 700 },
  leaf: { height: 188, left: 372, top: 60, width: 548 },
  refresh: { height: 54, left: 1452, top: 18, width: 418 },
  tabs: { height: 60, left: 1142, top: 88, width: 728 },
  title: { left: 58, top: 24, width: 720 }
} as const;

export const energyTrendCardKeys = ["card1", "card2", "card3", "card4", "card5"] as const;
