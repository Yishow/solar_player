import type { CSSProperties } from "react";
import { useId } from "react";

const factoryReferenceSpriteUrl = new URL(
  "./assets/factory-reference-sprite.png",
  import.meta.url
).href;

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

type FactoryCircuitSpriteRegion = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export const factoryCircuitReferenceLeafRegions = {
  lineLeaf: { height: 60, width: 85, x: 449, y: 144 },
  watermarkLeaf: { height: 135, width: 230, x: 4, y: 226 }
} as const satisfies Record<string, FactoryCircuitSpriteRegion>;

const factoryCircuitReferenceIconRegions = {
  bars: { height: 72, width: 71, x: 301, y: 144 },
  bolt: { height: 72, width: 71, x: 70, y: 144 },
  ev: { height: 56, width: 75, x: 550, y: 4 },
  hvac: { height: 62, width: 62, x: 340, y: 4 },
  infrastructure: { height: 61, width: 62, x: 4, y: 144 },
  inverter: { height: 90, width: 79, x: 83, y: 4 },
  leaf: { height: 71, width: 69, x: 376, y: 144 },
  lighting: { height: 68, width: 64, x: 406, y: 4 },
  office: { height: 59, width: 72, x: 474, y: 4 },
  pie: { height: 72, width: 70, x: 145, y: 144 },
  "production-line": { height: 65, width: 70, x: 266, y: 4 },
  solar: { height: 93, width: 75, x: 4, y: 4 },
  sun: { height: 78, width: 78, x: 219, y: 144 },
  switchboard: { height: 136, width: 96, x: 166, y: 4 }
} as const satisfies Record<FactoryCircuitRegistryIconKey, FactoryCircuitSpriteRegion>;

const FACTORY_REFERENCE_SPRITE_SIZE = {
  height: 365,
  width: 640
} as const;

function iconClassName(className?: string) {
  return ["h-full w-full", className ?? ""].join(" ").trim();
}

export function FactoryCircuitReferenceSprite({
  className,
  region,
  style
}: {
  className?: string;
  region: FactoryCircuitSpriteRegion;
  style?: CSSProperties;
}) {
  const clipPathId = `factory-reference-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      className={iconClassName(className)}
      fill="none"
      overflow="hidden"
      style={{ overflow: "hidden", ...style }}
      viewBox={`0 0 ${region.width} ${region.height}`}
    >
      <defs>
        <clipPath id={clipPathId}>
          <rect height={region.height} width={region.width} x="0" y="0" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipPathId})`}>
        <image
          height={FACTORY_REFERENCE_SPRITE_SIZE.height}
          href={factoryReferenceSpriteUrl}
          width={FACTORY_REFERENCE_SPRITE_SIZE.width}
          x={-region.x}
          y={-region.y}
        />
      </g>
    </svg>
  );
}

export function FactoryCircuitGlyph({
  className,
  name
}: {
  className?: string;
  name: FactoryCircuitRegistryIconKey;
}) {
  return (
    <FactoryCircuitReferenceSprite
      className={className}
      region={factoryCircuitReferenceIconRegions[name]}
    />
  );
}
