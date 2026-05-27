const barsIconUrl = new URL("./assets/factory-icon-bars-reference.png", import.meta.url).href;
const boltIconUrl = new URL("./assets/factory-icon-bolt-reference.png", import.meta.url).href;
const evIconUrl = new URL("./assets/factory-icon-ev-reference.png", import.meta.url).href;
const hvacIconUrl = new URL("./assets/factory-icon-hvac-reference.png", import.meta.url).href;
const infrastructureIconUrl = new URL("./assets/factory-icon-infrastructure-reference.png", import.meta.url).href;
const inverterIconUrl = new URL("./assets/factory-icon-inverter-reference.png", import.meta.url).href;
const leafIconUrl = new URL("./assets/factory-icon-leaf-reference.png", import.meta.url).href;
const lightingIconUrl = new URL("./assets/factory-icon-lighting-reference.png", import.meta.url).href;
const officeIconUrl = new URL("./assets/factory-icon-office-reference.png", import.meta.url).href;
const pieIconUrl = new URL("./assets/factory-icon-pie-reference.png", import.meta.url).href;
const productionLineIconUrl = new URL("./assets/factory-icon-production-line-reference.png", import.meta.url).href;
const solarIconUrl = new URL("./assets/factory-icon-solar-reference.png", import.meta.url).href;
const sunIconUrl = new URL("./assets/factory-icon-sun-reference.png", import.meta.url).href;
const switchboardIconUrl = new URL("./assets/factory-icon-switchboard-reference.png", import.meta.url).href;

export const factoryCircuitIconKeys = [
  "bars",
  "bolt",
  "ev",
  "hvac",
  "infrastructure",
  "inverter",
  "leaf",
  "lighting",
  "office",
  "pie",
  "production-line",
  "solar",
  "sun",
  "switchboard"
] as const;

export type FactoryCircuitRegistryIconKey = (typeof factoryCircuitIconKeys)[number];

type FactoryCircuitIconDefinition = {
  height: number;
  src: string;
  width: number;
};

const factoryCircuitIconDefinitions = {
  bars: {
    src: barsIconUrl,
    height: 74,
    width: 84
  },
  bolt: {
    src: boltIconUrl,
    height: 74,
    width: 84
  },
  ev: {
    src: evIconUrl,
    height: 77,
    width: 84
  },
  hvac: {
    src: hvacIconUrl,
    height: 72,
    width: 84
  },
  infrastructure: {
    src: infrastructureIconUrl,
    height: 76,
    width: 84
  },
  inverter: {
    src: inverterIconUrl,
    height: 106,
    width: 94
  },
  leaf: {
    src: leafIconUrl,
    height: 90,
    width: 90
  },
  lighting: {
    src: lightingIconUrl,
    height: 73,
    width: 84
  },
  office: {
    src: officeIconUrl,
    height: 74,
    width: 84
  },
  pie: {
    src: pieIconUrl,
    height: 74,
    width: 84
  },
  "production-line": {
    src: productionLineIconUrl,
    height: 70,
    width: 84
  },
  solar: {
    src: solarIconUrl,
    height: 116,
    width: 128
  },
  sun: {
    src: sunIconUrl,
    height: 74,
    width: 84
  },
  switchboard: {
    src: switchboardIconUrl,
    height: 142,
    width: 110
  }
} as const satisfies Record<FactoryCircuitRegistryIconKey, FactoryCircuitIconDefinition>;

function iconClassName(className?: string) {
  return ["factory-circuit-reference-icon", className ?? ""].join(" ").trim();
}

export function FactoryCircuitGlyph({
  className,
  name
}: {
  className?: string;
  name: FactoryCircuitRegistryIconKey;
}) {
  const definition = factoryCircuitIconDefinitions[name];

  return (
    <img
      alt=""
      aria-hidden="true"
      className={iconClassName(className)}
      data-factory-circuit-icon={name}
      draggable={false}
      src={definition.src}
      style={{
        height: "100%",
        width: "100%"
      }}
    />
  );
}
