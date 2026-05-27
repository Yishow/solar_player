export const imagesContentTopOffset = 110;

export const imagesTitleLayout = {
  left: 88,
  top: 166,
  width: 560
} as const;

export const imagesCopyLayout = {
  left: 82,
  top: 440,
  width: 450
} as const;

export const imagesGoldLayout = {
  height: 78,
  left: 34,
  top: 623,
  width: 548
} as const;

export const imagesCounterLayout = {
  height: 170,
  left: 82,
  top: 704,
  width: 408
} as const;

export const imagesMainLayout = {
  height: 622,
  left: 584,
  top: 148,
  width: 1292
} as const;

export const imagesInfoLayout = {
  height: 376,
  left: 1470,
  top: 414,
  width: 374
} as const;

export const imagesArrowLayout = {
  left: {
    left: 548,
    top: 832
  },
  right: {
    left: 1772,
    top: 832
  }
} as const;

export const imagesThumbLayout = [
  { left: 650, top: 804 },
  { left: 928, top: 804 },
  { left: 1206, top: 804 },
  { left: 1484, top: 804 }
] as const;

export const imagesThumbSize = {
  height: 118,
  width: 256
} as const;

export const imagesAssetMap = {
  main: {
    assetId: "images-hero-reference",
    src: "apps/web/src/pages/Images/assets/images-hero-reference.png"
  },
  thumbs: [
    {
      assetId: "images-thumb-1-reference",
      src: "apps/web/src/pages/Images/assets/images-thumb-1-reference.png"
    },
    {
      assetId: "images-thumb-2-reference",
      src: "apps/web/src/pages/Images/assets/images-thumb-2-reference.png"
    },
    {
      assetId: "images-thumb-3-reference",
      src: "apps/web/src/pages/Images/assets/images-thumb-3-reference.png"
    },
    {
      assetId: "images-thumb-4-reference",
      src: "apps/web/src/pages/Images/assets/images-thumb-4-reference.png"
    }
  ]
} as const;
