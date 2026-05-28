// Device status — FHD content area (1920 × 838) layout, redesigned to remove the
// resource/network overlap and give every region clear breathing room.
//
// Vertical budget:
//   28-76    title
//   64-554   left aside (3 status cards, h=156, gap 16)
//   64-574   info panel
//   64-304   photo
//   320-588  resource panel (h=268)
//   604-666  network bar (h=62)
//   686-742  actions row (h=56)
//   758-806  feedback strip (h=48)

export const deviceLayout = {
  actions: { height: 56, left: 50, top: 686, width: 1820 },
  feedback: { height: 48, left: 50, top: 758, width: 1820 },
  info: { height: 510, left: 460, top: 64, width: 710 },
  network: { height: 62, left: 1190, top: 604, width: 680 },
  photo: { height: 240, left: 1190, top: 64, width: 680 },
  resource: { height: 268, left: 1190, top: 320, width: 680 },
  side: { left: 50, top: 64, width: 390 },
  title: { left: 58, top: 28 }
} as const;
