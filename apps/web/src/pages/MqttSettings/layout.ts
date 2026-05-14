// FHD canvas coordinates for MQTT settings page (matches reference 09-mqtt-settings.css).
// Coordinates are relative to the content area inside DisplayCanvas (1920 × 838),
// i.e. reference top values minus the 146px header height.

export const mqttSettingsCanvas = {
  height: 838,
  width: 1920
} as const;

export const mqttSettingsLayout = {
  actions: {
    save: { left: 1595, top: 22, width: 250 },
    test: { left: 1316, top: 22, width: 250 }
  },
  cards: {
    map: { height: 604, left: 890, top: 162, width: 520 },
    mode: { height: 604, left: 50, top: 162, width: 435 },
    preview: { height: 604, left: 1428, top: 162, width: 435 },
    topic: { height: 604, left: 504, top: 162, width: 370 }
  },
  title: { left: 80, top: 44 }
} as const;
