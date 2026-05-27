export const solarContentTopOffset = 110;

export const solarTitleLayout = {
  left: 88,
  top: 166,
  width: 650
} as const;

export const solarHeroLayout = {
  height: 205,
  left: 0,
  top: 540,
  width: 1070
} as const;

export const solarFlowNodeLayout = {
  co2: {
    height: 230,
    left: 1545,
    top: 494,
    width: 230
  },
  factory: {
    height: 230,
    left: 1550,
    top: 162,
    width: 230
  },
  inverter: {
    height: 230,
    left: 1180,
    top: 162,
    width: 230
  },
  solar: {
    height: 230,
    left: 795,
    top: 162,
    width: 230
  }
} as const;

export const solarConnectorLayout = {
  inverterToCo2: {
    height: 5,
    left: 1365,
    top: 582,
    verticalHeight: 170,
    width: 148
  },
  inverterToFactory: {
    height: 5,
    left: 1410,
    top: 291,
    width: 108
  },
  solarToInverter: {
    height: 5,
    left: 1025,
    top: 291,
    width: 123
  }
} as const;

export const solarKpiLayout = {
  co2: {
    height: 220,
    left: 794,
    top: 760,
    width: 330
  },
  efficiency: {
    height: 220,
    left: 1506,
    top: 760,
    width: 360
  },
  generation: {
    height: 220,
    left: 52,
    top: 760,
    width: 380
  },
  selfConsumption: {
    height: 220,
    left: 448,
    top: 760,
    width: 330
  },
  totalCo2: {
    height: 220,
    left: 1140,
    top: 760,
    width: 350
  }
} as const;

export const solarAssetMap = {
  flow: {
    "carbon-reduction-display": {
      assetId: "carbon-reduction-display-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/carbon-reduction-display-source.png"
    },
    "factory-consumption-display": {
      assetId: "factory-consumption-display-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/factory-consumption-display-source.png"
    },
    "inverter-display": {
      assetId: "inverter-display-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/inverter-display-source.png"
    },
    "solar-panel-display": {
      assetId: "solar-panel-display-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-panel-display-source.png"
    }
  },
  hero: {
    assetId: "solar-carport-hero",
    src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-carport-hero.png"
  },
  kpi: {
    "metric-co2-today": {
      assetId: "carbon-reduction-display-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/carbon-reduction-display-source.png"
    },
    "metric-co2-total": {
      assetId: "metric-co2-total-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-co2-total-source.png"
    },
    "metric-efficiency": {
      assetId: "metric-efficiency-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-efficiency-source.png"
    },
    "metric-generation-sun": {
      assetId: "metric-generation-sun-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-generation-sun-source.png"
    },
    "metric-self-consumption": {
      assetId: "metric-self-consumption-source",
      src: "docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/metric-self-consumption-source.png"
    }
  }
} as const;
