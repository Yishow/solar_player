// FHD canvas coordinates for the playback settings editor.
// Reference 07-playback-settings.html shows a slideshow preview, not an editor;
// we adopt the MQTT-style card grid (4 cards + 2 action buttons) within the 1920 × 838 content area.

export const playbackSettingsLayout = {
  actions: {
    resync: { left: 1316, top: 22, width: 250 },
    save: { left: 1595, top: 22, width: 250 }
  },
  cards: {
    control: { height: 304, left: 50, top: 118, width: 596 },
    display: { height: 304, left: 1274, top: 118, width: 596 },
    pages: { height: 384, left: 50, top: 442, width: 1820 },
    schedule: { height: 304, left: 662, top: 118, width: 596 }
  },
  title: { left: 58, top: 28 }
} as const;
