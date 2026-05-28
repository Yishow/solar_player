// Slideshow preview — FHD content area (1920 × 838) layout.
// Controls (prev / play / next) are embedded as an overlay at the bottom of the active carousel card.
//
// Vertical budget:
//   28-76    title
//   70-530   left status rail (card 1 ~148px + gap 14 + card 2 ~298px)
//   78-538   carousel (h=460; active card peeks up via CSS top: 0, non-active top: 40)
//   558-770  summary (h=212)

export const slideshowLayout = {
  carousel: { height: 460, left: 360, top: 78, width: 1510 },
  status: { left: 50, top: 118, width: 282 },
  summary: { height: 212, left: 360, top: 610, width: 1510 },
  title: { left: 58, top: 28 }
} as const;

export const slideshowCardWidth = 278;
export const slideshowCardGap = 30;

// Equal-width cards (278px) + 30px gap = 308px step -> 1510 width
export const slideshowCardOffsets = [0, 308, 616, 924, 1232] as const;

export function resolveSlideshowCardOffsets(cardCount: number): number[] {
  const clampedCount = Math.max(1, Math.min(cardCount, slideshowCardOffsets.length));
  if (clampedCount === slideshowCardOffsets.length) {
    return [...slideshowCardOffsets];
  }

  const occupiedWidth =
    slideshowCardWidth * clampedCount
    + slideshowCardGap * Math.max(0, clampedCount - 1);
  const leadingOffset = Math.round((slideshowLayout.carousel.width - occupiedWidth) / 2);

  return Array.from({ length: clampedCount }, (_, index) =>
    leadingOffset + index * (slideshowCardWidth + slideshowCardGap)
  );
}
