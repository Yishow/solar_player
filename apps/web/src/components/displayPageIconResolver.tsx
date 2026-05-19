import { ReferenceGlyph } from "./ReferenceGlyph";
import {
  FactoryCircuitGlyph,
} from "../pages/FactoryCircuit/iconRegistry";
import {
  SustainabilityGlyph,
} from "../pages/Sustainability/iconRegistry";
import {
  isFactoryCircuitRegistryIconKey,
  isReferenceGlyphName,
  isSustainabilityRegistryIconKey,
  isValidDisplayPageIconSource,
  type DisplayPageIconSource
} from "../pages/shared/displayIconSourceConfig";

export type { DisplayPageIconSource } from "../pages/shared/displayIconSourceConfig";

function resolveRenderableSource(
  source: DisplayPageIconSource,
  seedSource: DisplayPageIconSource
): DisplayPageIconSource {
  if (isValidDisplayPageIconSource(source)) {
    return source;
  }

  return seedSource;
}

export function renderDisplayPageIcon({
  alt,
  className,
  seedSource,
  source
}: {
  alt?: string;
  className?: string;
  seedSource: DisplayPageIconSource;
  source: DisplayPageIconSource;
}) {
  const resolvedSource = resolveRenderableSource(source, seedSource);

  if (
    resolvedSource.mode === "asset-image" &&
    isValidDisplayPageIconSource(resolvedSource)
  ) {
    return <img alt={resolvedSource.alt ?? alt ?? ""} className={className} src={resolvedSource.src} />;
  }

  if (resolvedSource.mode === "reference-glyph" && isReferenceGlyphName(resolvedSource.glyphName)) {
    return <ReferenceGlyph className={className} name={resolvedSource.glyphName} />;
  }

  if (
    resolvedSource.mode === "page-icon-key" &&
    resolvedSource.registry === "factory-circuit" &&
    isFactoryCircuitRegistryIconKey(resolvedSource.iconKey)
  ) {
    return <FactoryCircuitGlyph className={className} name={resolvedSource.iconKey} />;
  }

  if (
    resolvedSource.mode === "page-icon-key" &&
    resolvedSource.registry === "sustainability" &&
    isSustainabilityRegistryIconKey(resolvedSource.iconKey)
  ) {
    return <SustainabilityGlyph className={className} name={resolvedSource.iconKey} />;
  }

  return null;
}
