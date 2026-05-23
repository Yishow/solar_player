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
    mode: { height: 604, left: 50, top: 162, width: 435 },
    topicWorkspace: { height: 604, left: 504, top: 162, width: 760 },
    weather: { height: 604, left: 1288, top: 162, width: 575 }
  },
  title: { left: 80, top: 44 }
} as const;
