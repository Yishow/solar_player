import { solarKpiLayout } from "../Solar/layout";

export const factoryCircuitLayoutMeta = {
  pageNumber: "03"
} as const;

export const factoryCircuitTitleLayout = {
  left: 88,
  top: 166,
  width: 590
} as const;

export const factoryCircuitCopyLayout = {
  left: 78,
  top: 445,
  width: 500
} as const;

export const factoryCircuitGoldLayout = {
  left: 66,
  top: 407,
  width: 520
} as const;

export const factoryCircuitLeafLayout = {
  height: 148,
  left: 555,
  top: 585,
  width: 255
} as const;

export const factoryCircuitStatusLayout = {
  left: 78,
  top: 620,
  width: 430
} as const;

export const factoryCircuitNodeLayout = {
  board: {
    height: 300,
    left: 1076,
    top: 286,
    width: 182
  },
  inverter: {
    height: 240,
    left: 862,
    top: 322,
    width: 136
  },
  solar: {
    height: 240,
    left: 666,
    top: 322,
    width: 136
  }
} as const;

export const factoryCircuitConnectorLayout = {
  inverterToBoard: {
    left: 1000,
    top: 440,
    width: 74
  },
  solarToInverter: {
    left: 804,
    top: 440,
    width: 58
  }
} as const;

export const factoryCircuitLoadPanelLayout = {
  height: 580,
  left: 1392,
  top: 146,
  width: 470
} as const;

export const factoryCircuitLoadRowLayout = [
  {
    height: 84,
    left: 1392,
    top: 146,
    width: 470
  },
  {
    height: 84,
    left: 1392,
    top: 241,
    width: 470
  },
  {
    height: 84,
    left: 1392,
    top: 336,
    width: 470
  },
  {
    height: 84,
    left: 1392,
    top: 431,
    width: 470
  },
  {
    height: 84,
    left: 1392,
    top: 526,
    width: 470
  },
  {
    height: 84,
    left: 1392,
    top: 621,
    width: 470
  }
] as const;

export const factoryCircuitKpiLayout = {
  flow: solarKpiLayout.efficiency,
  peak: solarKpiLayout.totalCo2,
  routing: solarKpiLayout.efficiency,
  selfConsumption: solarKpiLayout.co2,
  solarShare: solarKpiLayout.selfConsumption,
  totalPower: solarKpiLayout.generation
} as const;
