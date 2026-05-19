import { ReferenceGlyph, type ReferenceGlyphName } from "../../components/ReferenceGlyph";

export const sustainabilityIconKeys = [
  "bars",
  "co2",
  "esg-doc",
  "leaf",
  "procure",
  "tree",
  "trend"
] as const;

export type SustainabilityRegistryIconKey = (typeof sustainabilityIconKeys)[number];

function iconClassName(className?: string) {
  return ["h-full w-full", className ?? ""].join(" ").trim();
}

function renderReferenceGlyph(className: string | undefined, name: ReferenceGlyphName) {
  return <ReferenceGlyph className={className} name={name} />;
}

export function SustainabilityGlyph({
  className,
  name
}: {
  className?: string;
  name: SustainabilityRegistryIconKey;
}) {
  switch (name) {
    case "bars":
    case "co2":
    case "leaf":
      return renderReferenceGlyph(className, name);
    case "procure":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="21" />
          <path d="M18 23 H22 L26 42 H45" />
          <path d="M25 28 H46 L42 38 H28" />
          <circle cx="29" cy="45" r="2.7" fill="currentColor" stroke="none" />
          <circle cx="41" cy="45" r="2.7" fill="currentColor" stroke="none" />
          <path d="M40 18 C35 19 31 22 30 27 C35 27 39 25 40 18 Z" />
        </svg>
      );
    case "esg-doc":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="21" />
          <path d="M24 18 H38 L44 24 V46 H24 Z" />
          <path d="M38 18 V25 H44" />
          <path d="M29 31 H39 M29 36 H39 M29 41 H36" />
        </svg>
      );
    case "tree":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="21" />
          <path d="M32 19 C26 19 22 24 22 29 C22 32 23 34 25 36 C22 37 20 40 20 43 C20 48 24 52 31 52 H33 C40 52 44 48 44 43 C44 40 42 37 39 36 C41 34 42 32 42 29 C42 24 38 19 32 19 Z" />
          <path d="M32 34 V49" />
        </svg>
      );
    case "trend":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.35" viewBox="0 0 24 24">
          <path d="M4 16 L10 10 L14 14 L20 7" />
          <path d="M15 7 H20 V12" />
        </svg>
      );
    default:
      return null;
  }
}
