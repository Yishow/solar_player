// FHD content-area layout (1920 × 838) for the energy trend summary page.
// Restructured so the hero title sits cleanly on the left, refresh status pill
// on the top-right, range tabs below, and 5 trend cards across the lower half.
//
// Vertical budget:
//   28-84     title block
//   112-148   copy line
//   28-74     refresh status (top right)
//   86-144    range tabs row (right)
//   52-224    leaf watermark (decorative, behind copy)
//   204-766   5 trend cards (h=562)

export const energyTrendLayout = {
  cards: {
    card1: { height: 562, left: 50, top: 204, width: 352 },
    card2: { height: 562, left: 416, top: 204, width: 352 },
    card3: { height: 562, left: 782, top: 204, width: 352 },
    card4: { height: 562, left: 1148, top: 204, width: 352 },
    card5: { height: 562, left: 1514, top: 204, width: 352 }
  },
  copy: { left: 58, top: 112, width: 760 },
  leaf: { height: 172, left: 386, top: 52, width: 520 },
  refresh: { height: 46, left: 1440, top: 28, width: 430 },
  tabs: { height: 58, left: 1168, top: 86, width: 702 },
  title: { left: 58, top: 28, width: 720 }
} as const;

export const energyTrendCardKeys = ["card1", "card2", "card3", "card4", "card5"] as const;
