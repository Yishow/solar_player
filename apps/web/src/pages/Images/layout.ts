export const imagesContentTopOffset = 110;

export const imagesTitleLayout = {
  left: 82,
  top: 218,
  width: 510
} as const;

export const imagesCopyLayout = {
  left: 82,
  top: 470,
  width: 450
} as const;

export const imagesGrassLayout = {
  height: 124,
  left: 0,
  top: 584,
  width: 584
} as const;

export const imagesCounterLayout = {
  height: 170,
  left: 82,
  top: 704,
  width: 408
} as const;

export const imagesMainLayout = {
  height: 642,
  left: 584,
  top: 148,
  width: 1316
} as const;

export const imagesInfoLayout = {
  height: 376,
  left: 1470,
  top: 414,
  width: 398
} as const;

export const imagesArrowLayout = {
  left: {
    left: 545,
    top: 831
  },
  right: {
    left: 1765,
    top: 831
  }
} as const;

export const imagesThumbLayout = [
  { left: 650, top: 804 },
  { left: 928, top: 804 },
  { left: 1206, top: 804 },
  { left: 1484, top: 804 }
] as const;

export const imagesThumbSize = {
  height: 132,
  width: 256
} as const;

export const imagesAssetMap = {
  leftOrnament: {
    assetId: "images-left-ornament-reference",
    src: "apps/web/src/pages/Images/assets/images-left-ornament-reference.png"
  },
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
