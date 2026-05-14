// Slideshow preview — FHD content area (1920 × 838) layout, redesigned so the
// left rail (status + controls) and the right column (carousel + summary)
// each have non-overlapping vertical bands.
//
// Vertical budget:
//   8-58     title
//   70-488   left status rail (3 cards × 130 + 2 × 14 gap = 418)
//   504-560  left controls row (h=56)
//   78-538   right carousel (h=460, active card peeks up via CSS top: -36)
//   580-792  right summary (h=212)

export const slideshowLayout = {
  carousel: { height: 460, left: 360, top: 78, width: 1500 },
  controls: { height: 56, left: 50, top: 504, width: 282 },
  status: { left: 50, top: 70, width: 282 },
  summary: { height: 212, left: 360, top: 580, width: 1500 },
  title: { left: 58, top: 8 }
} as const;

export const slideshowCardOffsets = [0, 280, 560, 880, 1160] as const;
