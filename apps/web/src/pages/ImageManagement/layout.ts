// FHD canvas coordinates for the image management editor (within 1920 × 838 content area).
// Reference 08-image-management uses a 3-stat row + image grid + edit panel split;
// we collapse stats into the library card header to handle variable image counts.

export const imageManagementLayout = {
  actions: {
    resync: { left: 1316, top: 22, width: 250 },
    upload: { left: 1595, top: 22, width: 250 }
  },
  cards: {
    editor: { height: 720, left: 1410, top: 102, width: 460 },
    library: { height: 720, left: 50, top: 102, width: 1340 }
  },
  title: { left: 58, top: 28 }
} as const;
