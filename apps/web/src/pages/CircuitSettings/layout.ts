// FHD canvas coordinates for the circuit settings editor (within 1920 × 838 content area).
// Reference 10-circuit-settings uses a single wide table card + add/save buttons;
// we keep that structure and inline the 4 summary stats inside the card header.

export const circuitSettingsLayout = {
  actions: {
    add: { left: 1345, top: 22, width: 240 },
    resync: { left: 1095, top: 22, width: 240 },
    save: { left: 1595, top: 22, width: 250 }
  },
  cards: {
    table: { height: 692, left: 50, top: 110, width: 1820 }
  },
  title: { left: 58, top: 24 }
} as const;
