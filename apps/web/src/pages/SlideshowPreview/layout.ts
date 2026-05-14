// Slideshow preview — FHD content area (1920 × 838) layout.
// Controls (prev / play / next) are embedded as an overlay at the bottom of the active carousel card.
//
// Vertical budget:
//   8-58     title
//   70-530   left status rail (card 1 ~148px + gap 14 + card 2 ~298px)
//   78-538   carousel (h=460; active card peeks up via CSS top: 0, non-active top: 40)
//   558-770  summary (h=212)

export const slideshowLayout = {
  carousel: { height: 460, left: 360, top: 78, width: 1500 },
  status: { left: 50, top: 70, width: 282 },
  summary: { height: 212, left: 360, top: 558, width: 1500 },
  title: { left: 58, top: 8 }
} as const;

// Equal-width cards (278px) + 22px gap = 300px step → 5 cards × 300 − 22 = 1478px in 1500px carousel
export const slideshowCardOffsets = [0, 300, 600, 900, 1200] as const;
